<?php

namespace App\Services\Status;

use App\Models\StatusIncident;
use Carbon\CarbonInterface;

/**
 * Os textos que os utilizadores leem sobre um incidente — push, email e
 * página de estado usam todos estes, para nunca dizerem coisas diferentes.
 * Nunca incluem detalhes técnicos (só a causa pública, editável pelo
 * operador no painel de sistema).
 */
class IncidentMessages
{
    public const TIMEZONE = 'Africa/Luanda';

    /** @return array{title: string, body: string} */
    public static function started(): array
    {
        return [
            'title' => 'Ups, aconteceu um erro 😕',
            'body' => 'Pode ter problemas ao aceder a algumas funcionalidades da LUKU. '
                .'A equipa técnica já está a trabalhar na solução. '
                .'Agradecemos a sua paciência e preferência.',
        ];
    }

    /** @return array{title: string, body: string} */
    public static function resolved(StatusIncident $incident): array
    {
        return [
            'title' => 'Depois dos anjos estão os engenheiros! 😄',
            'body' => 'A nossa equipa técnica conseguiu corrigir o problema que aconteceu '
                .self::period($incident->started_at, $incident->resolved_at ?? now())
                .' devido a '.$incident->publicCause().'. '
                .'Já pode usar a LUKU normalmente. A nossa equipa está sempre a trabalhar '
                .'para fazer melhor — obrigado pela paciência e preferência!',
        ];
    }

    /** "das 18:18 às 18:40" no mesmo dia; com datas quando atravessa a meia-noite. */
    public static function period(CarbonInterface $from, CarbonInterface $to): string
    {
        $from = $from->copy()->timezone(self::TIMEZONE);
        $to = $to->copy()->timezone(self::TIMEZONE);

        if ($from->isSameDay($to)) {
            return "das {$from->format('H:i')} às {$to->format('H:i')}";
        }

        return "de {$from->format('d/m H:i')} a {$to->format('d/m H:i')}";
    }
}
