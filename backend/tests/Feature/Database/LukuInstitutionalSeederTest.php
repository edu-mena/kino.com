<?php

use App\Models\SiteFaq;
use App\Models\SiteSetting;
use App\Models\SiteTeamMember;
use App\Models\SiteTestimonial;
use Database\Seeders\LukuInstitutionalSeeder;

test('seeder popula o conteúdo institucional do site', function () {
    $this->seed(LukuInstitutionalSeeder::class);

    expect(SiteSetting::current()->contact_email)->toBe('ola@luku.ao')
        ->and(SiteTeamMember::count())->toBe(2)
        ->and(SiteTestimonial::count())->toBe(3)
        ->and(SiteFaq::count())->toBe(5);

    // Correr de novo (updateOrCreate) não deve duplicar.
    $this->seed(LukuInstitutionalSeeder::class);
    expect(SiteTeamMember::count())->toBe(2)
        ->and(SiteTestimonial::count())->toBe(3)
        ->and(SiteFaq::count())->toBe(5);
});
