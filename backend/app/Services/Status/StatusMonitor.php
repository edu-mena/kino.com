<?php

namespace App\Services\Status;

use App\Mail\StatusAlertMail;
use App\Models\StatusIncident;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Throwable;

/**
 * Corre a cada minuto (`status:check`) e gere sozinho o ciclo de um
 * incidente:
 *
 *   1.º minuto em falha  → abre o incidente e envia o alerta técnico ao
 *                          operador (com o erro exato e um botão para avisar
 *                          os utilizadores);
 *   M minutos estável    → fecha o incidente e avisa o operador (com um botão
 *                          para enviar o "Depois dos anjos estão os
 *                          engenheiros!").
 *
 * Os utilizadores NUNCA são avisados sozinhos — só quando o operador
 * autoriza (IncidentNotifier::announce, pelo email ou por /sistema/estado).
 *
 * Não depende de Redis nem da fila (são justamente serviços que vigia). Se a
 * própria base de dados estiver em baixo, o início do incidente fica num
 * ficheiro local (`status.fallback_state_path`) e passa para a base de
 * dados quando ela voltar.
 */
class StatusMonitor
{
    public function __construct(private readonly HealthChecks $checks) {}

    /** @return array<string, array{ok: bool, error: ?string, ms: int}> */
    public function tick(?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $results = $this->checks->run();
        $failing = $this->failingComponents($results);

        if (! $results['database']['ok']) {
            $this->handleWithoutDatabase($now, $failing, $results);

            return $results;
        }

        $this->recordDaily($now, $failing);
        $this->advanceIncident($now, $failing, $results);

        return $results;
    }

    /**
     * @param  array<string, array{ok: bool, error: ?string, ms: int}>  $results
     * @return list<string>
     */
    public function failingComponents(array $results): array
    {
        $failing = [];
        foreach (config('status.components') as $component => $definition) {
            foreach ($definition['checks'] as $check) {
                if (! ($results[$check]['ok'] ?? true)) {
                    $failing[] = $component;
                    break;
                }
            }
        }

        return $failing;
    }

    /**
     * @param  list<string>  $failing
     * @param  array<string, array{ok: bool, error: ?string, ms: int}>  $results
     */
    private function advanceIncident(CarbonImmutable $now, array $failing, array $results): void
    {
        $incident = StatusIncident::query()->open()->latest('started_at')->first();
        $fallback = $this->readFallback();

        if ($failing !== []) {
            if (! $incident) {
                $incident = StatusIncident::create([
                    'components' => $failing,
                    'internal_error' => $this->summarize($results),
                    'started_at' => $fallback['started_at'] ?? $now,
                    'last_failure_at' => $now,
                ]);
                // Já alertado por email quando a base de dados caiu.
                if (! $fallback) {
                    $this->alertOperator('started', $incident->components, $results, $incident->started_at, null, $incident);
                }
            } else {
                $incident->update([
                    'components' => array_values(array_unique([...$incident->components, ...$failing])),
                    'internal_error' => $this->summarize($results),
                    'last_failure_at' => $now,
                    'recovering_since' => null,
                ]);
            }
            $this->clearFallback();

            return;
        }

        // Tudo OK. Um incidente que só existia no ficheiro (a base de dados
        // esteve em baixo e já voltou) passa agora para a base de dados.
        if (! $incident && $fallback) {
            $incident = StatusIncident::create([
                'components' => $fallback['components'],
                'internal_error' => $fallback['internal_error'],
                'started_at' => $fallback['started_at'],
                'last_failure_at' => $now,
            ]);
        }
        $this->clearFallback();

        if (! $incident) {
            return;
        }

        if ($incident->recovering_since === null) {
            $incident->update(['recovering_since' => $now]);

            return;
        }

        if ($incident->recovering_since->diffInMinutes($now) < $this->resolveAfter()) {
            return;
        }

        $incident->update(['resolved_at' => $incident->recovering_since]);
        $this->alertOperator('resolved', $incident->components, $results, $incident->started_at, $incident->resolved_at, $incident);
    }

    /**
     * Base de dados em baixo: nada a gravar lá. Guarda o início num ficheiro
     * local e alerta o operador uma vez — os utilizadores veem a faixa de
     * erro sozinha (o frontend mostra-a quando a API não responde).
     *
     * @param  list<string>  $failing
     * @param  array<string, array{ok: bool, error: ?string, ms: int}>  $results
     */
    private function handleWithoutDatabase(CarbonImmutable $now, array $failing, array $results): void
    {
        if ($this->readFallback()) {
            return;
        }

        $this->writeFallback([
            'started_at' => $now->toIso8601String(),
            'components' => $failing,
            'internal_error' => $this->summarize($results),
        ]);
        $this->alertOperator('started', $failing, $results, $now);
    }

    /** @param list<string> $failing */
    private function recordDaily(CarbonImmutable $now, array $failing): void
    {
        $date = $now->timezone(IncidentMessages::TIMEZONE)->toDateString();
        $rows = [];
        foreach (array_keys(config('status.components')) as $component) {
            $rows[] = [
                'component' => $component,
                'date' => $date,
                'total_minutes' => 1,
                'ok_minutes' => in_array($component, $failing, true) ? 0 : 1,
            ];
        }

        $this->safely(fn () => DB::table('status_daily')->upsert($rows, ['component', 'date'], [
            'total_minutes' => DB::raw('status_daily.total_minutes + 1'),
            'ok_minutes' => DB::raw('status_daily.ok_minutes + excluded.ok_minutes'),
        ]));
    }

    /**
     * @param  'started'|'resolved'  $phase
     * @param  list<string>  $components
     * @param  array<string, array{ok: bool, error: ?string, ms: int}>  $results
     */
    private function alertOperator(string $phase, array $components, array $results, \DateTimeInterface $startedAt, ?\DateTimeInterface $resolvedAt = null, ?StatusIncident $incident = null): void
    {
        $to = config('status.alert_email');
        if (! $to) {
            Log::error('status: incidente sem email de alerta configurado (STATUS_ALERT_EMAIL)', ['phase' => $phase, 'components' => $components]);

            return;
        }

        $format = fn (\DateTimeInterface $d) => CarbonImmutable::instance($d)->timezone(IncidentMessages::TIMEZONE)->format('d/m/Y H:i');

        $this->safely(fn () => Mail::to($to)->send(new StatusAlertMail(
            $phase,
            $components,
            $results,
            $format($startedAt),
            $resolvedAt ? $format($resolvedAt) : null,
            // Botão "avisar os utilizadores" — o aviso nunca sai sozinho.
            $incident ? URL::temporarySignedRoute('status.announce', now()->addDays(3), ['incident' => $incident->uuid, 'phase' => $phase]) : null,
        )));
    }

    /** @param array<string, array{ok: bool, error: ?string, ms: int}> $results */
    private function summarize(array $results): string
    {
        return collect($results)
            ->reject(fn ($r) => $r['ok'])
            ->map(fn ($r, $name) => "{$name}: {$r['error']}")
            ->implode("\n");
    }

    private function resolveAfter(): int
    {
        return (int) config('status.resolve_after_minutes', 5);
    }

    /** @return array{started_at: CarbonImmutable, components: list<string>, internal_error: string}|null */
    private function readFallback(): ?array
    {
        $path = config('status.fallback_state_path');
        if (! is_file($path)) {
            return null;
        }
        $data = json_decode((string) file_get_contents($path), true);
        if (! is_array($data) || empty($data['started_at'])) {
            return null;
        }

        return [
            'started_at' => CarbonImmutable::parse($data['started_at']),
            'components' => $data['components'] ?? [],
            'internal_error' => (string) ($data['internal_error'] ?? ''),
        ];
    }

    /** @param array<string, mixed> $state */
    private function writeFallback(array $state): void
    {
        $path = config('status.fallback_state_path');
        @mkdir(dirname($path), 0775, true);
        file_put_contents($path, json_encode($state));
    }

    private function clearFallback(): void
    {
        $path = config('status.fallback_state_path');
        if (is_file($path)) {
            @unlink($path);
        }
    }

    /** Um aviso que falha nunca pode impedir o resto do ciclo. */
    private function safely(callable $fn): void
    {
        try {
            $fn();
        } catch (Throwable $e) {
            Log::error('status: passo do monitor falhou', ['error' => $e->getMessage()]);
        }
    }
}
