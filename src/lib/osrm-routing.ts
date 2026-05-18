import { memoryCache } from './cache';

export type RouteGeometryResult = {
  coordinates: { latitude: number; longitude: number }[];
  distanceKm: number;
  durationMinutes: number;
};

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    geometry: { coordinates: [number, number][] };
    distance?: number;
    duration?: number;
  }>;
}

const OSRM_SERVERS = [
  (originLng: number, originLat: number, destLng: number, destLat: number) =>
    `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`,
  (originLng: number, originLat: number, destLng: number, destLat: number) =>
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`,
];

const CACHE_TTL_MS = 30 * 60 * 1000;

async function fetchFromOsrmUrl(url: string): Promise<RouteGeometryResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as OsrmRouteResponse;
    const route = data.routes?.[0];
    if (data.code !== 'Ok' || !route?.geometry?.coordinates?.length) return null;

    const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    if (coordinates.length < 2) return null;

    const distanceKm =
      route.distance != null && Number.isFinite(route.distance)
        ? Math.round((route.distance / 1000) * 100) / 100
        : 0;
    const durationMinutes =
      route.duration != null && Number.isFinite(route.duration)
        ? Math.max(1, Math.round(route.duration / 60))
        : 1;

    return { coordinates, distanceKm, durationMinutes };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Rota rodoviária via OSRM (servidor público, com cache). */
export async function getDrivingRouteGeometry(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number
): Promise<RouteGeometryResult> {
  const cacheKey = `route:${originLat},${originLng}|${destinationLat},${destinationLng}`;
  const cached = memoryCache.get<RouteGeometryResult>(cacheKey);
  if (cached) return cached;

  for (const buildUrl of OSRM_SERVERS) {
    const url = buildUrl(originLng, originLat, destinationLng, destinationLat);
    const result = await fetchFromOsrmUrl(url);
    if (result) {
      memoryCache.set(cacheKey, result, CACHE_TTL_MS);
      return result;
    }
  }

  throw new Error('Não foi possível calcular a rota no mapa');
}
