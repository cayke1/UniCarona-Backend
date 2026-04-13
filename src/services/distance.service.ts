import NodeCache from 'node-cache';
import { config } from '../lib/config';

const cache = new NodeCache({ stdTTL: 3600 });

interface DistanceMatrixElement {
  status: string;
  duration?: { value: number; text: string };
  distance?: { value: number; text: string };
}

interface DistanceMatrixResponse {
  status: string;
  origin_addresses: string[];
  destination_addresses: string[];
  rows: Array<{
    elements: DistanceMatrixElement[];
  }>;
}

interface CachedDistanceResult {
  distanceKm: number;
  durationMinutes: number;
  distanceText: string;
  durationText: string;
}

export class DistanceService {
  private static readonly GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

  static async getDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<CachedDistanceResult> {
    const origin = `${originLat},${originLng}`;
    const destination = `${destLat},${destLng}`;
    const cacheKey = `distance:${origin}:${destination}`;

    const cached = cache.get<CachedDistanceResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const apiKey = config.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return this.calculateHaversineDistance(originLat, originLng, destLat, destLng);
    }

    try {
      const params = new URLSearchParams({
        origins: origin,
        destinations: destination,
        key: apiKey,
      });

      const response = await fetch(`${this.GOOGLE_MAPS_API_URL}?${params}`);
      const data: DistanceMatrixResponse = await response.json();

      if (data.status !== 'OK' || !data.rows[0]?.elements[0]) {
        return this.calculateHaversineDistance(originLat, originLng, destLat, destLng);
      }

      const element = data.rows[0].elements[0];
      if (element.status !== 'OK' || !element.distance || !element.duration) {
        return this.calculateHaversineDistance(originLat, originLng, destLat, destLng);
      }

      const result: CachedDistanceResult = {
        distanceKm: element.distance.value / 1000,
        durationMinutes: Math.ceil(element.duration.value / 60),
        distanceText: element.distance.text,
        durationText: element.duration.text,
      };

      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Google Maps API error, falling back to Haversine:', error);
      return this.calculateHaversineDistance(originLat, originLng, destLat, destLng);
    }
  }

  static calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): CachedDistanceResult {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    const durationMinutes = Math.ceil((distanceKm / 60) * 60);

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes,
      distanceText: `${distanceKm.toFixed(1)} km`,
      durationText: `${durationMinutes} min`,
    };
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  static clearCache(): void {
    cache.flushAll();
  }
}
