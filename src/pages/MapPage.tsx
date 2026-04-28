import { useEffect, useState } from "react";
import { discoverNearby } from "../api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import type { ProviderSummary } from "../types";

export function MapPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    const lat = localStorage.getItem("lat");
    const lng = localStorage.getItem("lng");

    if (!lat || !lng) return;

    const loc = { lat: parseFloat(lat), lng: parseFloat(lng) };
    setLocation(loc);

    discoverNearby({
      latitude: loc.lat,
      longitude: loc.lng,
      radius_meters: 5000,
    }).then(setProviders);
  }, []);

  if (!location) return <p>Loading...</p>;

  return (
    <section>
      <button onClick={() => navigate(-1)}>⬅ Back</button>

      <h2>Navigation Map</h2>

      <div style={{ height: "500px" }}>
        <MapContainer center={[location.lat, location.lng]} zoom={13} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Marker position={[location.lat, location.lng]}>
            <Popup>Your Location</Popup>
          </Marker>

          {providers.map((p) =>
            p.location?.coordinates ? (
              <Marker
                key={p.id}
                position={[
                  p.location.coordinates[1],
                  p.location.coordinates[0],
                ]}
              >
                <Popup>{p.name}</Popup>
              </Marker>
            ) : null
          )}
        </MapContainer>
      </div>
    </section>
  );
}