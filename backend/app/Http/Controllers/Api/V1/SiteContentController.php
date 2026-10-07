<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SiteContent\StoreSiteFaqRequest;
use App\Http\Requests\Api\V1\SiteContent\StoreSiteTeamMemberRequest;
use App\Http\Requests\Api\V1\SiteContent\StoreSiteTestimonialRequest;
use App\Http\Requests\Api\V1\SiteContent\UpdateSiteFaqRequest;
use App\Http\Requests\Api\V1\SiteContent\UpdateSiteSettingsRequest;
use App\Http\Requests\Api\V1\SiteContent\UpdateSiteTeamMemberRequest;
use App\Http\Requests\Api\V1\SiteContent\UpdateSiteTestimonialRequest;
use App\Http\Resources\Api\V1\SiteFaqResource;
use App\Http\Resources\Api\V1\SiteSettingResource;
use App\Http\Resources\Api\V1\SiteTeamMemberResource;
use App\Http\Resources\Api\V1\SiteTestimonialResource;
use App\Jobs\ProcessUploadedVideoJob;
use App\Models\SiteFaq;
use App\Models\SiteSetting;
use App\Models\SiteTeamMember;
use App\Models\SiteTestimonial;
use App\Services\MediaUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Conteúdo institucional editável em /sistema/conteudo — contacto, texto
 * "Sobre nós", equipa, testemunhos e FAQ (ver plano). Um controller só para
 * os 4 sub-recursos: são pequenos, sempre editados na mesma página, e todos
 * seguem a mesma regra de autorização (system_operator only, ver cada
 * FormRequest::authorize()) — separar em 4 controllers finos não
 * acrescentava nada.
 */
class SiteContentController extends Controller
{
    /** Público — consumido por /sobre e /contacto (sem sessão nenhuma). */
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => [
                'settings' => new SiteSettingResource(SiteSetting::current()),
                'team' => SiteTeamMemberResource::collection(
                    SiteTeamMember::query()->orderBy('position')->get(),
                ),
                'testimonials' => SiteTestimonialResource::collection(
                    SiteTestimonial::query()->orderBy('position')->get(),
                ),
                'faqs' => SiteFaqResource::collection(
                    SiteFaq::query()->orderBy('position')->get(),
                ),
            ],
        ]);
    }

    public function updateSettings(UpdateSiteSettingsRequest $request, MediaUploadService $uploads): SiteSettingResource
    {
        $setting = SiteSetting::current();
        $data = $request->validated();
        $media = $request->file('hero_media');
        $lukuVideo = $request->file('luku_video');
        unset($data['hero_media'], $data['luku_video'], $data['luku_video_reset']);

        if (array_key_exists('guest_content', $data)) {
            $data['guest_content'] = $this->mergeGuestContent(
                $setting->guest_content ?? [],
                $data['guest_content'] ?? [],
            );
        }

        // Vídeo da página Luku: trocar ou repor o original (o que vem com o
        // site) apaga o anterior; o novo passa pelo mesmo ffmpeg do vídeo
        // da página Sobre, com estado próprio (`luku_video_status`).
        if ($lukuVideo || $request->boolean('luku_video_reset')) {
            $uploads->deleteByUrl($setting->luku_video_url);
            $uploads->deleteByUrl($setting->luku_video_poster_url);
            $data['luku_video_url'] = null;
            $data['luku_video_poster_url'] = null;
            $data['luku_video_status'] = $lukuVideo ? 'processing' : 'ready';
        }
        if ($lukuVideo) {
            $rawPath = $uploads->storeRawVideo($lukuVideo, 'site', 'luku-video');
        }

        if ($media) {
            $isVideo = str_starts_with((string) $media->getMimeType(), 'video/');

            if ($setting->about_hero_image_url) {
                $uploads->deleteByUrl($setting->about_hero_image_url);
            }

            if ($isVideo) {
                $data['about_hero_image_url'] = null;
                $data['about_hero_media_type'] = 'video';
                $data['processing_status'] = 'processing';
            } else {
                $data['about_hero_image_url'] = $uploads->storeImage($media, 'site', 'about-hero');
                $data['about_hero_media_type'] = 'image';
                $data['about_hero_thumbnail_url'] = null;
                $data['processing_status'] = 'ready';
            }

            $setting->update($data);

            if ($isVideo) {
                $rawPath = $uploads->storeRawVideo($media, 'site', 'about-hero');
                ProcessUploadedVideoJob::dispatch(
                    SiteSetting::class, $setting->id, $rawPath,
                    'about_hero_image_url', 'about_hero_thumbnail_url', 'site',
                );
            }
        } else {
            $setting->update($data);
        }

        if (isset($rawPath)) {
            ProcessUploadedVideoJob::dispatch(
                SiteSetting::class, $setting->id, $rawPath,
                'luku_video_url', 'luku_video_poster_url', 'site', 'luku_video_status',
            );
        }

        return new SiteSettingResource($setting->fresh());
    }

    /**
     * Junta as alterações às já guardadas: só as chaves enviadas mudam
     * (cada página do admin guarda as suas sem apagar as das outras), e
     * texto/URL vazio remove a chave — a página volta ao original.
     *
     * @param  array<string, mixed>  $current
     * @param  array<string, mixed>  $changes
     * @return array{texts: array<string, string>, media: array<string, string>, flags: array<string, bool>}
     */
    private function mergeGuestContent(array $current, array $changes): array
    {
        $merged = [];
        // Interruptores: true/false grava, null volta ao por omissão.
        $flags = (array) ($current['flags'] ?? []);
        foreach ((array) ($changes['flags'] ?? []) as $key => $value) {
            if ($value === null) {
                unset($flags[$key]);
            } else {
                $flags[$key] = (bool) $value;
            }
        }
        $merged['flags'] = $flags;
        foreach (['texts', 'media'] as $group) {
            $values = (array) ($current[$group] ?? []);
            foreach ((array) ($changes[$group] ?? []) as $key => $value) {
                $value = is_string($value) ? trim($value) : '';
                if ($value === '') {
                    unset($values[$key]);
                } else {
                    $values[$key] = $value;
                }
            }
            $merged[$group] = $values;
        }

        return $merged;
    }

    public function storeTeamMember(StoreSiteTeamMemberRequest $request): JsonResponse
    {
        $data = $request->validated();
        $member = SiteTeamMember::query()->create([
            ...$data,
            'position' => $data['position'] ?? ((int) SiteTeamMember::query()->max('position') + 1),
        ]);

        return (new SiteTeamMemberResource($member))->response()->setStatusCode(201);
    }

    public function updateTeamMember(UpdateSiteTeamMemberRequest $request, SiteTeamMember $teamMember): SiteTeamMemberResource
    {
        $teamMember->update($request->validated());

        return new SiteTeamMemberResource($teamMember->fresh());
    }

    public function destroyTeamMember(Request $request, SiteTeamMember $teamMember): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $teamMember->delete();

        return response()->json(status: 204);
    }

    public function storeTestimonial(StoreSiteTestimonialRequest $request): JsonResponse
    {
        $data = $request->validated();
        $testimonial = SiteTestimonial::query()->create([
            ...$data,
            'position' => $data['position'] ?? ((int) SiteTestimonial::query()->max('position') + 1),
        ]);

        return (new SiteTestimonialResource($testimonial))->response()->setStatusCode(201);
    }

    public function updateTestimonial(UpdateSiteTestimonialRequest $request, SiteTestimonial $testimonial): SiteTestimonialResource
    {
        $testimonial->update($request->validated());

        return new SiteTestimonialResource($testimonial->fresh());
    }

    public function destroyTestimonial(Request $request, SiteTestimonial $testimonial): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $testimonial->delete();

        return response()->json(status: 204);
    }

    public function storeFaq(StoreSiteFaqRequest $request): JsonResponse
    {
        $data = $request->validated();
        $faq = SiteFaq::query()->create([
            ...$data,
            'position' => $data['position'] ?? ((int) SiteFaq::query()->max('position') + 1),
        ]);

        return (new SiteFaqResource($faq))->response()->setStatusCode(201);
    }

    public function updateFaq(UpdateSiteFaqRequest $request, SiteFaq $faq): SiteFaqResource
    {
        $faq->update($request->validated());

        return new SiteFaqResource($faq->fresh());
    }

    public function destroyFaq(Request $request, SiteFaq $faq): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $faq->delete();

        return response()->json(status: 204);
    }
}
