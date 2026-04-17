import { memoryCache } from './cache';

interface DistanceMatrixElement {
  status: string;
  duration?: { value: number };
  distance?: { value: number };
}

interface DistanceMatrixRow {
  elements: DistanceMatrixElement[];
}

interface DistanceMatrixResponse {
  status: string;
  rows: DistanceMatrixRow[];
}

interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
}

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

export async function getDistanceAndDuration(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DistanceResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  const origin = `${originLat},${originLng}`;
  const destination = `${destLat},${destLng}`;
  const cacheKey = `${origin}|${destination}`;

  const cached = memoryCache.get<DistanceResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = new URL(
    'https://maps.googleapis.com/maps/api/distancematrix/json'
  );
  url.searchParams.set('origins', origin);
  url.searchParams.set('destinations', destination);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Google Maps API error: ${response.status}`);
  }

  const data = (await response.json()) as DistanceMatrixResponse;

  if (data.status !== 'OK' || !data.rows[0]?.elements[0]) {
    throw new Error(`Google Maps API returned status: ${data.status}`);
  }

  const element = data.rows[0].elements[0];

  if (element.status !== 'OK') {
    throw new Error(`Route not found: ${element.status}`);
  }

  if (!element.distance || !element.duration) {
    throw new Error('Missing distance or duration in response');
  }

  const result: DistanceResult = {
    distanceKm: element.distance.value / 1000,
    durationMinutes: Math.ceil(element.duration.value / 60)
  };

  const ttl = parseInt(process.env.GOOGLE_MAPS_CACHE_TTL ?? '', 10);
  const ttlMs = Number.isNaN(ttl) ? DEFAULT_CACHE_TTL_MS : ttl * 1000;

  memoryCache.set(cacheKey, result, ttlMs);

  return result;
}
