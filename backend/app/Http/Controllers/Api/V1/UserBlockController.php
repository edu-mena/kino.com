<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\UserBlock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bloquear o autor de uma avaliação (App Store, guideline 1.2) — as
 * avaliações dele deixam de aparecer a quem bloqueou (ReviewController::
 * index). Pela avaliação, nunca por id de utilizador: quem bloqueia não
 * fica a saber nada da conta da outra pessoa além do nome que já via.
 */
class UserBlockController extends Controller
{
    public function store(Request $request, Review $review): JsonResponse
    {
        $user = $request->user();
        abort_unless($review->user_id, 422, 'Esta avaliação já não tem autor associado.');
        abort_if($review->user_id === $user->id, 422, 'Não pode bloquear-se a si próprio.');

        UserBlock::query()->firstOrCreate(['user_id' => $user->id, 'blocked_user_id' => $review->user_id]);

        return response()->json(['message' => 'Não vai voltar a ver avaliações desta pessoa.'], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $blocks = UserBlock::query()->where('user_id', $request->user()->id)
            ->with('blocked:id,name')->latest()->get();

        return response()->json(['data' => $blocks->map(fn ($b) => [
            'id' => $b->uuid,
            'name' => $b->blocked?->name,
            'blockedAt' => $b->created_at->toIso8601String(),
        ])]);
    }

    public function destroy(Request $request, UserBlock $block): JsonResponse
    {
        abort_unless($block->user_id === $request->user()->id, 404);
        $block->delete();

        return response()->json(status: 204);
    }
}
