<?php

use App\Jobs\ExpireStoriesJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Ver docker-compose.yml (serviço "scheduler") — corre `schedule:run` a cada
// minuto; este job em si só faz trabalho de facto a cada 15min.
Schedule::job(new ExpireStoriesJob)->everyFifteenMinutes()->onOneServer();
