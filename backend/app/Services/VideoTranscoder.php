<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

/**
 * Wrapper fino sobre o binário `ffmpeg` (instalado na imagem Docker da app —
 * ver docker/php/Dockerfile). Corre sempre dentro de ProcessUploadedVideoJob
 * (fila Redis), nunca no request síncrono — mesmo um vídeo curto de story
 * pode levar vários segundos a transcodificar.
 */
class VideoTranscoder
{
    private const TIMEOUT_SECONDS = 300;

    /**
     * Recomprime para h264/aac, largura máxima 720px (mantém aspect ratio),
     * `+faststart` para começar a tocar antes de acabar de transferir —
     * story/promo são consumidos em mobile, não há razão para enviar o
     * ficheiro bruto do telemóvel do restaurante tal e qual.
     */
    public function transcode(string $inputPath, string $outputPath): void
    {
        $this->run([
            'ffmpeg', '-y', '-i', $inputPath,
            '-vf', "scale='min(720,iw)':-2",
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
            '-c:a', 'aac', '-b:a', '96k',
            '-movflags', '+faststart',
            $outputPath,
        ], $outputPath);
    }

    /** Frame a meio segundo — usado como thumbnail/poster (ex: ofertas em vídeo). */
    public function generateThumbnail(string $inputPath, string $outputPath): void
    {
        $this->run([
            'ffmpeg', '-y', '-i', $inputPath,
            '-ss', '00:00:00.5', '-vframes', '1',
            $outputPath,
        ], $outputPath);
    }

    private function run(array $command, string $expectedOutputPath): void
    {
        $process = new Process($command);
        $process->setTimeout(self::TIMEOUT_SECONDS);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        if (! is_file($expectedOutputPath)) {
            throw new RuntimeException('ffmpeg_no_output_file');
        }
    }
}
