/**
 * Geolocation capture used by the welcome onboarding.
 *
 * We only need foreground permission + a one-shot reverse geocode to an
 * ISO country code. Background/continuous tracking is explicitly out of
 * scope (privacy, battery, and unnecessary for endemicity logic).
 *
 * Docs: https://docs.expo.dev/versions/latest/sdk/location/
 */

import * as Location from 'expo-location';
import { endemicityFor, type EndemicityStatus } from '../data/whoMalariaEndemic';

export type GeoResult = {
  latitude: number;
  longitude: number;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  endemicity: EndemicityStatus;
};

export type GeoFailure =
  | { kind: 'permission_denied' }
  | { kind: 'position_unavailable'; error: string }
  | { kind: 'reverse_geocode_failed'; error: string };

export async function requestPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function captureLocation(): Promise<
  { ok: true; data: GeoResult } | { ok: false; error: GeoFailure }
> {
  const granted = await requestPermission();
  if (!granted) return { ok: false, error: { kind: 'permission_denied' } };

  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch (e: any) {
    return {
      ok: false,
      error: { kind: 'position_unavailable', error: e?.message ?? 'unknown' },
    };
  }

  const { latitude, longitude } = position.coords;

  let countryCode: string | null = null;
  let countryName: string | null = null;
  let region: string | null = null;
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const hit = results[0];
    if (hit) {
      countryCode = hit.isoCountryCode ?? null;
      countryName = hit.country ?? null;
      region = hit.region ?? hit.subregion ?? null;
    }
  } catch (e: any) {
    return {
      ok: false,
      error: { kind: 'reverse_geocode_failed', error: e?.message ?? 'unknown' },
    };
  }

  return {
    ok: true,
    data: {
      latitude,
      longitude,
      countryCode,
      countryName,
      region,
      endemicity: endemicityFor(countryCode),
    },
  };
}
