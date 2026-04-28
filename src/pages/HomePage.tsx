import { useCallback, useEffect, useState } from "react";
import { getProvider } from "../api";
import { RouteMap } from "../components/RouteMap";
import { discoverNearby, getServiceTypes } from "../api";
import type { ProviderSummary } from "../types";
import { useSaved } from "../context/SavedContext";
import { DiscoveryPanel } from "../components/DiscoveryPanel";
import { ProviderList } from "../components/ProviderList";
import { ProviderDetailModal } from "../components/ProviderDetailModal";
import type { LocationState } from "../types";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "./HomePage.css";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export function HomePage() {
  const { toggleSaved, isSaved } = useSaved();
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [radius, setRadius] = useState(5000);
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch full provider details when selected
  useEffect(() => {
    if (!selectedProviderId || selectedProvider) return;
    
    setRouteLoading(true);
    getProvider(selectedProviderId)
      .then((provider) => {
        setSelectedProvider(provider);
        setRouteLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch provider:', error);
        setRouteLoading(false);
      });
  }, [selectedProviderId]);

   

  const getRoute = async (lat1: number, lng1: number, lat2: number, lng2: number) => {
  try {
    const res = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car/geojson`,
      {
        method: "POST",
        headers: {
          "Authorization": "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijc0Zjk4M2ViZGYxOTRiMTM4MWQ2MTU4ZGZjMzkzYjgwIiwiaCI6Im11cm11cjY0In0=",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [lng1, lat1],
            [lng2, lat2],
          ],
        }),
      }
    );

    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      console.error("No route found");
      return;
    }

    const coords = data.features[0].geometry.coordinates.map(
      (c: any) => [c[1], c[0]]
    );

    setRouteCoords(coords);

  } catch (err) {
    console.error("Route error:", err);
  }
};

  const startVoiceSearch = () => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Voice search not supported in this browser");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript.toLowerCase();

    let converted = transcript;

    if (transcript.includes("ఎలక్ట్రిషియన్")) converted = "electrician";
    else if (transcript.includes("దర్జీ")) converted = "tailor";
    else if (transcript.includes("మేస్త్రీ")) converted = "mason";
    else if (transcript.includes("బూట్లు")) converted = "cobbler";

    setSearchTerm(converted);
  };

  recognition.start();
};
  // 📍 Get user location
  const requestLocation = useCallback(() => {
    setLocation({ status: "requesting" });

    if (!navigator.geolocation) {
      setLocation({ status: "error", message: "Geolocation not supported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          status: "ready",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setLocation({
          status: err.code === 1 ? "denied" : "error",
          message: err.message || "Could not get location",
        });
      }
    );
  }, []);

  // 📦 Load service types
  useEffect(() => {
    getServiceTypes().then(setServiceTypes);
  }, []);

  // 🔍 Fetch providers
  useEffect(() => {
    if (location.status !== "ready") {
      setProviders([]);
      return;
    }

    setLoading(true);

    discoverNearby({
      longitude: location.lng,
      latitude: location.lat,
      radius_meters: radius,
      service_type: serviceFilter,
    })
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, [location, radius, serviceFilter]);

  return (
    <>
      
      {/* HERO SECTION */}
      <section className="hero">
        <h1>Find Nearby Services</h1>
        <p>Discover trusted services near you quickly and easily</p>
      </section>

      {/* FILTER PANEL */}
      <div className="search-container">
      <input
        type="text"
        placeholder="Search services (e.g., electrician, tailor...)"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <button onClick={startVoiceSearch} className="mic-btn">
       🎤 Speak (Telugu / English)
      </button>
      </div>
      <div className="panel-container">
        <DiscoveryPanel
          location={location}
          onRequestLocation={requestLocation}
          radius={radius}
          onRadiusChange={setRadius}
          serviceTypes={serviceTypes}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
        />
      </div>
      
      {/* RESULTS SECTION */}
      <section className="results-section">
        <h2>Available Services</h2>

        <ProviderList
          providers={providers.filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.service_type.toLowerCase().includes(searchTerm.toLowerCase())
          )} // ✅ No filtering
          loading={loading}
          onViewDetails={setSelectedProviderId}
          onSaveToggle={(id, e) => {
            e?.stopPropagation();
            toggleSaved(id);
          }}
          isSaved={isSaved}
        />
        <section className="map-section">
  <h2>Navigation Map</h2>

  <div style={{ height: "400px", marginTop: "20px" }}>
    <MapContainer
      center={[
        location.status === "ready" ? location.lat : 16.5062,
        location.status === "ready" ? location.lng : 80.6480,
      ]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* 📍 User location */}
      {location.status === "ready" && (
        <Marker position={[location.lat, location.lng]}>
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {/* 📍 Providers */}
      {providers
  .filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.service_type.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .map((p) =>
        p.location?.coordinates ? (
          <Marker
            key={p.id}
            position={[
              p.location.coordinates[1],
              p.location.coordinates[0],
            ]}
            eventHandlers={{
  click: () => {
    setSelectedProviderId(p.id);
    setRouteCoords([]); // ✅ clear old route

    if (location.status === "ready") {
      getRoute(
        location.lat,
        location.lng,
        p.location.coordinates[1],
        p.location.coordinates[0]
      );
    }
  },
}}
          >
            <Popup>{p.name}</Popup>
          </Marker>
        ) : null
      )}

      {/* 🛣️ Route */}
      {routeCoords.length > 0 && (
        <Polyline positions={routeCoords} pathOptions={{ color: "blue" }} />
      )}
    </MapContainer>
  </div>
        </section>

        {/* 🎤 VOICE NAVIGATOR - New Feature */}
        {selectedProvider && location.status === "ready" && (
          <section className="voice-nav-section">
            <h2>🧭 Voice Navigation to {selectedProvider.name}</h2>
            {routeLoading ? (
              <div className="loading">Loading navigation...</div>
            ) : (
              <RouteMap 
                service={selectedProvider} 
                userLocation={{ lat: location.lat, lng: location.lng }} 
              />
            )}
          </section>
        )}
      </section>

      {/* DETAILS MODAL */}
      <ProviderDetailModal
        providerId={selectedProviderId}
        onClose={() => setSelectedProviderId(null)}
      />
    </>
  );
}