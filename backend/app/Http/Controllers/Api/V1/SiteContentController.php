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
        unset($data['hero_media']);

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

        return new SiteSettingResource($setting->fresh());
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
