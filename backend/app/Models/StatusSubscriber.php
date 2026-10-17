<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** Email inscrito nos avisos de incidente (página /estado), com dupla
 * confirmação: só recebe avisos depois de clicar no link do email. */
class StatusSubscriber extends Model
{
    protected $fillable = ['email', 'token', 'confirmed_at'];

    protected function casts(): array
    {
        return ['confirmed_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $subscriber) {
            $subscriber->token ??= Str::random(48);
        });
    }

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->whereNotNull('confirmed_at');
    }

    public function confirmUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/estado?confirmar='.$this->token;
    }

    public function unsubscribeUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/estado?cancelar='.$this->token;
    }
}
