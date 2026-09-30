<?php

namespace App\Http\Resources\Api\V1;

use App\Models\UserPreference;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin UserPreference */
class UserPreferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'dietaryRestrictions' => $this->dietary_restrictions ?? [],
            'language' => $this->language,
            'notificationsEnabled' => $this->notifications_enabled ?? true,
            // Deixa os restaurantes cujo perfil visita verem o seu nome em
            // "Quem viu o seu perfil" — desligado por omissão (ver
            // ProfileViewController::index).
            'shareNameOnProfileVisits' => (bool) ($this->share_name_on_profile_visits ?? false),
            // Booleano, não a timestamp em si — o frontend só precisa de
            // saber "já viu" ou não (ver src/lib/tutorial.tsx). Preso à
            // CONTA (aqui), não ao browser (era o bug: localStorage sozinho
            // fazia o tutorial/card de restrições reaparecer em qualquer
            // dispositivo/browser novo, ou depois de limpar dados do site).
            'tutorialSeen' => $this->tutorial_seen_at !== null,
            'dietaryOnboardingSeen' => $this->dietary_onboarding_seen_at !== null,
        ];
    }
}
