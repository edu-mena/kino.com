import { googleMapsBrowserKey, isGoogleMapsEnabled } from "./config";

/**
 * Carrega a Maps JavaScript API uma única vez (script com `loading=async`) e
 * expõe `importLibrary` — o padrão oficial da Google, sem dependência nova.
 * Só é chamado quando `isGoogleMapsEnabled`; nunca corre no SSR.
 */

type Libraries = {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  geocoding: google.maps.GeocodingLibrary;
  geometry: google.maps.GeometryLibrary;
};

let bootstrap: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (bootstrap) return bootstrap;
  bootstrap = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps só carrega no browser"));
      return;
    }
    if (typeof (window as { google?: typeof google }).google?.maps?.importLibrary === "function") {
      resolve();
      return;
    }
    const callback = "__lukuGoogleMapsReady";
    (window as unknown as Record<string, () => void>)[callback] = () => resolve();
    const params = new URLSearchParams({
      key: googleMapsBrowserKey,
      v: "weekly",
      loading: "async",
      language: "pt",
      region: "AO",
      callback,
    });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      bootstrap = null;
      reject(new Error("Falha ao carregar a Google Maps JavaScript API"));
    };
    document.head.appendChild(script);
  });
  return bootstrap;
}

export async function loadGoogleLibrary<K extends keyof Libraries>(name: K): Promise<Libraries[K]> {
  if (!isGoogleMapsEnabled) throw new Error("Google Maps não está configurado");
  await loadScript();
  return (await google.maps.importLibrary(name)) as Libraries[K];
}
