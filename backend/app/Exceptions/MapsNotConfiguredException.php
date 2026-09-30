<?php

namespace App\Exceptions;

use RuntimeException;

/** `GOOGLE_MAPS_SERVER_KEY` ausente — os endpoints de mapas respondem 503. */
class MapsNotConfiguredException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('GOOGLE_MAPS_SERVER_KEY não está definido.');
    }
}
