<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Restaurants\StoreGalleryImageRequest;
use App\Http\Requests\Api\V1\Restaurants\StoreRestaurantRequest;
use App\Http\Requests\Api\V1\Restaurants\UpdateRestaurantHoursRequest;
use App\Http\Requests\Api\V1\Restaurants\UpdateRestaurantPaymentDetailsRequest;
use App\Http\Requests\Api\V1\Restaurants\UpdateRestaurantRequest;
use App\Http\Resources\Api\V1\RestaurantResource;
use App\Models\Restaurant;
use App\Models\RestaurantGalleryImage;
use App\Models\RestaurantHour;
use App\Services\MediaUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class RestaurantController extends Controller
{
    /**
     * Listagem pública — cacheada 5min por combinação de filtros (ver
     * plano, secção Redis), invalidada no `update()` abaixo.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        // Chave inclui uma "geração" em vez de usar Cache::tags() — o driver
        // Redis suportaria tags, mas assim a invalidação (forgetIndexCache)
        // funciona com qualquer driver de cache (importante para os testes,
        // que correm em `array`) sem lógica diferente por ambiente.
        $generation = Cache::get('restaurants:index:generation', 0);
        $cacheKey = "restaurants:index:{$generation}:".md5($request->getQueryString() ?? '');

        $restaurants = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($request) {
            return QueryBuilder::for(Restaurant::class)
                ->allowedFilters(
                    AllowedFilter::exact('city'),
                    AllowedFilter::exact('cuisine'),
                    AllowedFilter::exact('is_featured'),
                    AllowedFilter::callback('fulfillment', function ($query, $value) {
                        $query->whereJsonContains('fulfillment_modes', $value);
                    }),
                    AllowedFilter::callback('search', function ($query, $value) {
                        $query->where('name', 'ilike', "%{$value}%");
                    }),
                )
                ->allowedSorts('name', 'rating', 'created_at')
                ->defaultSort('-is_featured', '-rating')
                ->cursorPaginate($request->integer('per_page', 20));
        });

        return RestaurantResource::collection($restaurants);
    }

    public function show(Restaurant $restaurant): RestaurantResource
    {
        return new RestaurantResource(
            $restaurant->load(['galleryImages', 'hours.ranges'])
        );
    }

    public function store(StoreRestaurantRequest $request): JsonResponse
    {
        $restaurant = Restaurant::query()->create($request->validated());

        $this->forgetIndexCache();

        return (new RestaurantResource($restaurant))->response()->setStatusCode(201);
    }

    public function update(UpdateRestaurantRequest $request, Restaurant $restaurant): RestaurantResource
    {
        $restaurant->update($request->validated());

        $this->forgetIndexCache();

        return new RestaurantResource($restaurant);
    }

    /** Substitui o `WeeklyHours` inteiro (7 dias) numa transação. */
    public function updateHours(UpdateRestaurantHoursRequest $request, Restaurant $restaurant): RestaurantResource
    {
        DB::transaction(function () use ($request, $restaurant) {
            foreach ($request->validated()['days'] as $day) {
                $hour = RestaurantHour::query()->updateOrCreate(
                    ['restaurant_id' => $restaurant->id, 'weekday' => $day['weekday']],
                    ['is_open' => $day['is_open']],
                );

                $hour->ranges()->delete();
                foreach ($day['ranges'] ?? [] as $range) {
                    $hour->ranges()->create($range);
                }
            }
        });

        $this->forgetIndexCache();

        return new RestaurantResource($restaurant->load('hours.ranges'));
    }

    /** Só owner — ver UpdateRestaurantPaymentDetailsRequest::authorize(). */
    public function updatePaymentDetails(UpdateRestaurantPaymentDetailsRequest $request, Restaurant $restaurant): JsonResponse
    {
        DB::transaction(function () use ($request, $restaurant) {
            foreach ($request->validated()['details'] as $detail) {
                $restaurant->paymentDetails()->updateOrCreate(
                    ['payment_method_code' => $detail['payment_method_code']],
                    ['details' => $detail['details']],
                );
            }
        });

        return response()->json(['data' => $restaurant->paymentDetails()->get(['payment_method_code', 'details'])]);
    }

    public function storeGalleryImage(StoreGalleryImageRequest $request, Restaurant $restaurant, MediaUploadService $uploads): JsonResponse
    {
        $url = $uploads->storeImage($request->file('image'), 'gallery', $restaurant->uuid);

        $image = $restaurant->galleryImages()->create([
            'url' => $url,
            'position' => $restaurant->galleryImages()->max('position') + 1,
        ]);

        return response()->json(['data' => ['id' => $image->id, 'url' => $image->url]], 201);
    }

    public function destroyGalleryImage(Restaurant $restaurant, RestaurantGalleryImage $galleryImage, MediaUploadService $uploads): JsonResponse
    {
        abort_unless($galleryImage->restaurant_id === $restaurant->id, 404);
        $this->authorize('update', $restaurant);

        $uploads->deleteByUrl($galleryImage->url);
        $galleryImage->delete();

        return response()->json(status: 204);
    }

    /** Invalida TODAS as combinações de filtros cacheadas de uma vez, sem
     * precisar de Cache::tags() (só redis/memcached suportam) — incrementar
     * a geração faz as chaves antigas nunca mais serem lidas (expiram
     * sozinhas pelo TTL, sem precisar apagar cada uma). */
    private function forgetIndexCache(): void
    {
        Cache::increment('restaurants:index:generation');
    }
}
