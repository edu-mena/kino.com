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
use Illuminate\View\View;
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
            // Só os que o operador decidiu comunicar — o resto (falhas curtas,
            // falsos alarmes) fica só no painel de sistema.
            ->where(fn ($q) => $q->whereNotNull('users_notified_at')->orWhereNotNull('resolution_notified_at'))
            ->latest('started_at')
            ->limit(20)
            ->get()
            ->map(fn (StatusIncident $i) => $this->publicIncident($i));

        return response()->json(['data' => [
            'status' => $overall,
            'components' => $components,
            // Faixa da app e incidente em destaque: só depois de o operador
            // autorizar o aviso (ver IncidentNotifier::announce).
            'activeIncident' => $open?->users_notified_at ? $this->publicIncident($open) : null,
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
    public function systemIndex(Request $request, IncidentNotifier $notifier): JsonResponse
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
                'canAnnounceStarted' => $notifier->canAnnounce($i, 'started'),
                'canAnnounceResolved' => $notifier->canAnnounce($i, 'resolved'),
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
    public function systemResolveIncident(Request $request, StatusIncident $incident): JsonResponse
    {
        $this->assertOperator($request);
        abort_if($incident->resolved_at !== null, 422, 'O incidente já está resolvido.');

        // A mensagem de resolução NÃO sai sozinha — ver systemAnnounce.
        $incident->update(['resolved_at' => now(), 'recovering_since' => $incident->recovering_since ?? now()]);

        return response()->json(['data' => $this->publicIncident($incident->fresh())]);
    }

    /** Painel de sistema: autorizar o aviso aos utilizadores. */
    public function systemAnnounce(Request $request, StatusIncident $incident, IncidentNotifier $notifier): JsonResponse
    {
        $this->assertOperator($request);
        $phase = $request->validate(['phase' => ['required', 'in:started,resolved']])['phase'];
        abort_unless($notifier->announce($incident, $phase), 422, 'Este aviso já foi enviado ou já não se aplica.');

        return response()->json(['data' => $this->publicIncident($incident->fresh())]);
    }

    /** Link do email de alerta (assinado): mostra a mensagem e pede
     * confirmação — abrir o link nunca envia nada sozinho (os filtros de
     * email abrem links para os verificar). */
    public function announceConfirm(Request $request, StatusIncident $incident, string $phase, IncidentNotifier $notifier): View
    {
        abort_unless(in_array($phase, ['started', 'resolved'], true), 404);

        return view('status.announce', [
            'state' => $notifier->canAnnounce($incident, $phase) ? 'confirm' : 'unavailable',
            'phase' => $phase,
            'message' => $phase === 'started' ? IncidentMessages::started() : IncidentMessages::resolved($incident),
            'actionUrl' => $request->fullUrl(),
        ]);
    }

    public function announceFromEmail(StatusIncident $incident, string $phase, IncidentNotifier $notifier): View
    {
        abort_unless(in_array($phase, ['started', 'resolved'], true), 404);
        $sent = $notifier->announce($incident, $phase);

        return view('status.announce', ['state' => $sent ? 'sent' : 'unavailable', 'phase' => $phase]);
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
