export interface ProviderSummary {
  id: string;
  name: string;
  service_type: string;
  description: string | null;
  address: string | null;
  area: string | null;
  distance_meters: number | null;
  trust_score: number;
  community_photos_count: number;
  confirmations_count: number;
  has_trust_badge: boolean;
  years_in_business: number | null;
  last_verified: string | null;
  opening_hours: string[];
  services_offered: string[];
  phone: string | null;
  location: { type: string; coordinates: [number, number] };
}

export interface ProviderDetail extends ProviderSummary {
  location: { type: string; coordinates: [number, number] };
  photo_urls: string[];
}

export interface LocationInput {
  longitude: number;
  latitude: number;
  radius_meters?: number;
  service_type?: string | null;
}

export type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "denied"; message: string }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error"; message: string };
