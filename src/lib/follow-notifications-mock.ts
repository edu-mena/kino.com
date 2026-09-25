import { useEffect, useRef } from "react";
import { safeLocalStorageSet } from "@/data/safe-storage";
import type { MenuItem, Offer, RestaurantStory } from "@/data/types";
import { useMenuItems } from "@/data/use-menu-items";
import { useOffers } from "@/data/use-offers";
import { useEffectiveStories } from "@/data/use-stories";
import { getStoredFollows } from "@/lib/follows";
import type { LukuNotification } from "@/lib/notifications";

/**
 * Demo (sem backend) dos avisos a seguidores — o que o servidor faz em
 * FollowerBroadcaster: story novo, promoção nova e preços mudados de um
 * restaurante seguido geram uma notificação para cada conta de demo que o
 * segue com o sino ligado. Mudanças de preço vistas de uma vez saem numa
 * só notificação por restaurante ("atualizou N preços").
 *
 * O que já foi visto fica em localStorage (não só em memória) — recarregar
 * a página nunca faz stories/promoções antigas "reaparecerem" como novas.
 * Na primeira vez de sempre, regista a base sem avisar.
 */
const SEEN_KEY = "luku_follow_seen_v1";

/** Cada fonte tem a sua base — ausente = ainda nunca vista (regista sem avisar). */
type Seen = { stories?: string[]; offers?: string[]; prices?: Record<string, number | null> };

function readSeen(): Seen | null {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Seen) : null;
  } catch {
    return null;
  }
}

function writeSeen(seen: Seen) {
  safeLocalStorageSet(SEEN_KEY, JSON.stringify(seen));
}

function notesFor(
  restaurantId: string,
  event: string,
  status: string,
  refKey: string,
): LukuNotification[] {
  const at = new Date().toISOString();
  return getStoredFollows()
    .filter((f) => f.restaurantId === restaurantId && f.notify)
    .map((f) => ({
      id: `ntf-restaurant-${restaurantId}-${event}-${refKey}-${f.ownerKey}`,
      kind: "restaurant" as const,
      refId: restaurantId,
      restaurantId,
      event,
      status,
      ownerKey: f.ownerKey,
      at,
      read: false,
    }));
}

export function useMockFollowerNotes(push: (notes: LukuNotification[]) => void, enabled: boolean) {
  const stories = useEffectiveStories();
  const offers = useOffers();
  const { items } = useMenuItems();
  // O 1º valor de cada hook é sempre o seed estático (SSR-safe) — só o que
  // chega depois da sincronização com o localStorage conta. Compara pela
  // referência (não um contador) porque o StrictMode repete o efeito com o
  // mesmo valor inicial.
  const initial = useRef<Record<string, unknown>>({});
  const pushRef = useRef(push);
  pushRef.current = push;

  const diff = (
    source: "stories" | "offers" | "items",
    next: RestaurantStory[] | Offer[] | MenuItem[],
  ) => {
    if (!enabled || typeof window === "undefined") return;
    if (!(source in initial.current)) initial.current[source] = next;
    if (initial.current[source] === next) return;
    const base: Seen = readSeen() ?? {};
    const fresh: LukuNotification[] = [];

    if (source === "stories") {
      const known = base.stories ? new Set(base.stories) : null;
      for (const s of next as RestaurantStory[]) {
        if (known && !known.has(s.id) && s.restaurantId) {
          fresh.push(...notesFor(s.restaurantId, "followStoryNew", "", s.id));
        }
      }
      base.stories = (next as RestaurantStory[]).map((s) => s.id);
    } else if (source === "offers") {
      const known = base.offers ? new Set(base.offers) : null;
      for (const o of next as Offer[]) {
        if (known && !known.has(o.id) && o.restaurantId) {
          fresh.push(...notesFor(o.restaurantId, "followOfferNew", o.title, o.id));
        }
      }
      base.offers = (next as Offer[]).map((o) => o.id);
    } else {
      const changedByRestaurant = new Map<string, string[]>();
      for (const m of next as MenuItem[]) {
        const was = base.prices?.[m.id];
        if (was !== undefined && was !== m.price) {
          const list = changedByRestaurant.get(m.restaurantId) ?? [];
          list.push(`${m.id}:${m.price}`);
          changedByRestaurant.set(m.restaurantId, list);
        }
      }
      for (const [restaurantId, changes] of changedByRestaurant) {
        fresh.push(
          ...notesFor(restaurantId, "followPriceChange", String(changes.length), changes.join(",")),
        );
      }
      base.prices = Object.fromEntries((next as MenuItem[]).map((m) => [m.id, m.price]));
    }

    writeSeen(base);
    if (fresh.length) pushRef.current(fresh);
  };

  useEffect(() => diff("stories", stories), [stories]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => diff("offers", offers), [offers]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => diff("items", items), [items]); // eslint-disable-line react-hooks/exhaustive-deps
}
