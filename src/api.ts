import type { LocationInput, ProviderDetail, ProviderSummary } from "./types";

// In production (Vercel): set VITE_API_URL to your Render backend URL.
// In local dev: falls back to /api which Vite proxies to localhost:8000.
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function discoverNearby(
  input: LocationInput
): Promise<ProviderSummary[]> {
  const res = await fetch(`${API_BASE}/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      longitude: input.longitude,
      latitude: input.latitude,
      radius_meters: input.radius_meters ?? 5000,
      service_type: input.service_type ?? null,
    }),
  });
  if (!res.ok) throw new Error("Discover request failed");
  return res.json();
}

export async function getProvider(id: string): Promise<ProviderDetail> {
  const res = await fetch(`${API_BASE}/providers/${id}`);
  if (!res.ok) throw new Error("Provider not found");
  return res.json();
}

export async function getServiceTypes(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/service-types`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.service_types ?? [];
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ email: string; token: string }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Login failed");
  }
  return res.json();
}

export async function signupUser(
  name: string,
  email: string,
  password: string
): Promise<{ email: string; token: string }> {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Signup failed");
  }
  return res.json();
}
