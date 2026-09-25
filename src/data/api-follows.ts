import { apiFetch } from "@/lib/api-client";

/** Seguir restaurante — backend/app/Http/Controllers/Api/V1/FollowController.php.
 * Só usado quando `hasRealBackend`; sem ele, @/lib/follows guarda em
 * localStorage. */

export type ApiFollow = {
  restaurantId: string;
  notify: boolean;
  followedAt: string | null;
};

export type ApiFollowState = {
  restaurantId: string;
  following: boolean;
  notify: boolean;
  followersCount: number;
};

export async function fetchApiFollows(token: string): Promise<ApiFollow[]> {
  const { data } = await apiFetch<{
    data: { restaurant: { id: string }; notify: boolean; followedAt: string | null }[];
  }>("/follows", { token });
  return data.map((f) => ({
    restaurantId: f.restaurant.id,
    notify: f.notify,
    followedAt: f.followedAt,
  }));
}

export async function followApiRestaurant(
  restaurantId: string,
  token: string,
): Promise<ApiFollowState> {
  const { data } = await apiFetch<{ data: ApiFollowState }>(`/restaurants/${restaurantId}/follow`, {
    method: "POST",
    token,
  });
  return data;
}

export async function unfollowApiRestaurant(
  restaurantId: string,
  token: string,
): Promise<ApiFollowState> {
  const { data } = await apiFetch<{ data: ApiFollowState }>(`/restaurants/${restaurantId}/follow`, {
    method: "DELETE",
    token,
  });
  return data;
}

export async function setApiFollowNotify(
  restaurantId: string,
  notify: boolean,
  token: string,
): Promise<ApiFollowState> {
  const { data } = await apiFetch<{ data: ApiFollowState }>(`/restaurants/${restaurantId}/follow`, {
    method: "PATCH",
    token,
    body: { notify },
  });
  return data;
}
