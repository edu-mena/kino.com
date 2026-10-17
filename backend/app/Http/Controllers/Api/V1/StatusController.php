<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\StatusSubscriptionConfirmMail;
use App\Models\StatusIncident;
use App\Models\StatusSubscriber;
use App\Services\Status\HealthChecks;
use App\Services\Status\IncidentMessages;
use App\Services\Status\IncidentNotifier;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Página de estado (/estado) e faixa de incidente da app.
 *
 * A parte pública (`show`) só expõe o que o cliente sente — serviço,
 * estado, disponibilidade, mensagens de incidente — nunca nomes de
 * infraestrutura nem mensagens de erro (`internal_error` só sai em
 * `system*`, para operadores).
 */
class StatusController extends Controller
{
    private const HISTORY_DAYS = 90;

    public function show(): JsonResponse
    {
        $open = StatusIncident::query()->open()->latest('started_at')->first();
        $failing = $open && $open->recovering_since === null ? $open->components : [];
        $recovering = $open && $open->recovering_since !== null ? $open->components : [];

        $components = $this->components($failing, $recovering);

        $overall = match (true) {
            $failing !== [] => 'incident',
            $recovering !== [] => 'recovering',
            default => 'operational',
        };

        $incidents = StatusIncident::query()
            ->where('started_at', '>=', now()->subDays(30))
            // Falhas de 1-2 minutos que ninguém chegou a notar não são
            // "incidentes" para o público (o operador vê-as no painel).
            ->where(fn ($q) => $q->whereNull('resolved_at')->orWhereNotNull('users_notified_at')->orWhereNotNull('resolution_notified_at'))
            ->latest('started_at')
            ->limit(20)
            ->get()
            ->map(fn (StatusIncident $i) => $this->publicIncident($i));

        return response()->json(['data' => [
            'status' => $overall,
            'components' => $components,
            'activeIncident' => $open && ($open->users_notified_at || $open->recovering_since === null && $this->longEnough($open))
                ? $this->publicIncident($open)
                : null,
            'incidents' => $incidents,
            'generatedAt' => now()->toIso8601String(),
        ]])->header('Cache-Control', 'public, max-age=30');
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:255']]);
        $email = mb_strtolower($data['email']);

        $subscriber = StatusSubscriber::query()->firstOrCreate(['email' => $email]);
        if ($subscriber->confirmed_at === null) {
            try {
                Mail::to($email)->send(new StatusSubscriptionConfirmMail($subscriber));
            } catch (Throwable $e) {
                Log::warning('status: email de confirmação falhou', ['error' => $e->getMessage()]);
            }
        }

        // Resposta igual quer o email já estivesse inscrito ou não — não
        // deixa ninguém descobrir quem está na lista.
        return response()->json(['data' => ['pending' => true]], 202);
    }

    public function confirm(Request $request): JsonResponse
    {
        $subscriber = $this->subscriberFromToken($request);
        $subscriber->confirmed_at ??= now();
        $subscriber->save();

        return response()->json(['data' => ['confirmed' => true]]);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $this->subscriberFromToken($request)->delete();

        return response()->json(['data' => ['unsubscribed' => true]]);
    }

    /** Painel de sistema: incidentes com o erro técnico. */
    public function systemIndex(Request $request): JsonResponse
    {
        $this->assertOperator($request);

        $incidents = StatusIncident::query()->latest('started_at')->limit(50)->get()
            ->map(fn (StatusIncident $i) => [
                ...$this->publicIncident($i),
                'internalError' => $i->internal_error,
                'publicCause' => $i->public_cause,
                'defaultCause' => config('status.default_public_cause'),
                'usersNotifiedAt' => $i->users_notified_at?->toIso8601String(),
                'resolutionNotifiedAt' => $i->resolution_notified_at?->toIso8601String(),
            ]);

        return response()->json(['data' => [
            'incidents' => $incidents,
            'subscribers' => StatusSubscriber::query()->confirmed()->count(),
        ]]);
    }

    /** Painel de sistema: corre as verificações agora (sem mexer em incidentes). */
    public function systemCheck(Request $request, HealthChecks $checks): JsonResponse
    {
        $this->assertOperator($request);

        return response()->json(['data' => $checks->run()]);
    }

    public function systemUpdateIncident(Request $request, StatusIncident $incident): JsonResponse
    {
        $this->assertOperator($request);
        $data = $request->validate(['public_cause' => ['nullable', 'string', 'max:160']]);

        $incident->update(['public_cause' => $data['public_cause'] ?: null]);

        return response()->json(['data' => $this->publicIncident($incident)]);
    }

    /** Fecha à mão um incidente (ex.: falso alarme, ou já resolvido e não
     * se quer esperar pelos minutos de estabilidade). */
    public function systemResolveIncident(Request $request, StatusIncident $incident, IncidentNotifier $notifier): JsonResponse
    {
        $this->assertOperator($request);
        abort_if($incident->resolved_at !== null, 422, 'O incidente já está resolvido.');

        $incident->update(['resolved_at' => now(), 'recovering_since' => $incident->recovering_since ?? now()]);
        if ($incident->users_notified_at !== null) {
            $incident->update(['resolution_notified_at' => now()]);
            $notifier->notify($incident, 'resolved');
        }

        return response()->json(['data' => $this->publicIncident($incident->fresh())]);
    }

    /**
     * @param  list<string>  $failing
     * @param  list<string>  $recovering
     * @return list<array<string, mixed>>
     */
    private function components(array $failing, array $recovering): array
    {
        $from = CarbonImmutable::now(IncidentMessages::TIMEZONE)->subDays(self::HISTORY_DAYS - 1)->startOfDay();
        $rows = DB::table('status_daily')
            ->where('date', '>=', $from->toDateString())
            ->get()
            ->groupBy('component');

        $result = [];
        foreach (array_keys(config('status.components')) as $key) {
            $byDate = ($rows[$key] ?? collect())->keyBy(fn ($r) => substr((string) $r->date, 0, 10));
            $days = [];
            $total = 0;
            $ok = 0;
            for ($i = 0; $i < self::HISTORY_DAYS; $i++) {
                $date = $from->addDays($i)->toDateString();
                $row = $byDate[$date] ?? null;
                $days[] = [
                    'date' => $date,
                    'uptime' => $row && $row->total_minutes > 0 ? round($row->ok_minutes / $row->total_minutes * 100, 2) : null,
                ];
                $total += $row->total_minutes ?? 0;
                $ok += $row->ok_minutes ?? 0;
            }

            $result[] = [
                'key' => $key,
                'status' => in_array($key, $failing, true) ? 'outage' : (in_array($key, $recovering, true) ? 'recovering' : 'operational'),
                'uptime' => $total > 0 ? round($ok / $total * 100, 2) : null,
                'days' => $days,
            ];
        }

        return $result;
    }

    /** @return array<string, mixed> */
    private function publicIncident(StatusIncident $incident): array
    {
        $resolved = $incident->resolved_at !== null;

        return [
            'id' => $incident->uuid,
            'status' => $resolved ? 'resolved' : ($incident->recovering_since ? 'monitoring' : 'investigating'),
            'components' => $incident->components,
            'startedAt' => $incident->started_at->toIso8601String(),
            'resolvedAt' => $incident->resolved_at?->toIso8601String(),
            'cause' => $resolved ? $incident->publicCause() : null,
            'message' => $resolved ? IncidentMessages::resolved($incident) : IncidentMessages::started(),
        ];
    }

    private function longEnough(StatusIncident $incident): bool
    {
        return $incident->started_at->diffInMinutes(now()) >= (int) config('status.notify_users_after_minutes', 3);
    }

    private function subscriberFromToken(Request $request): StatusSubscriber
    {
        $token = (string) $request->validate(['token' => ['required', 'string', 'max:64']])['token'];

        return StatusSubscriber::query()->where('token', $token)->firstOrFail();
    }

    private function assertOperator(Request $request): void
    {
        abort_unless($request->user()?->isSystemOperator(), 403);
    }
}
