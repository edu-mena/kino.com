<?php

namespace App\Console\Commands;

use App\Services\Status\StatusMonitor;
use Illuminate\Console\Command;

/**
 * Uma volta do monitor de estado — ver StatusMonitor. Corre a cada minuto
 * DIRETAMENTE no ciclo do processo `scheduler` (fly.toml), não via
 * `schedule:run`: esse precisa da cache (mutex/interrupt) e falhava inteiro
 * quando o Redis caía — exatamente quando o monitor é mais preciso.
 */
class CheckServiceStatus extends Command
{
    protected $signature = 'status:check';

    protected $description = 'Verifica os serviços da Luku e gere os incidentes (avisos ao operador e aos utilizadores)';

    public function handle(StatusMonitor $monitor): int
    {
        $results = $monitor->tick();

        $this->table(
            ['Verificação', 'Estado', 'Tempo', 'Erro'],
            collect($results)->map(fn ($r, $name) => [$name, $r['ok'] ? 'OK' : 'FALHA', "{$r['ms']} ms", $r['error'] ?? ''])->values(),
        );

        return self::SUCCESS;
    }
}
