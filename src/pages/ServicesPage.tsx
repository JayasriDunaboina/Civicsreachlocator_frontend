import { useEffect, useState } from "react";
import { discoverNearby } from "../api";
import { ProviderList } from "../components/ProviderList";
import { ProviderDetailModal } from "../components/ProviderDetailModal";
import { useSaved } from "../context/SavedContext";
import { useNavigate } from "react-router-dom";
import type { ProviderSummary } from "../types";

export function ServicesPage() {
  const { toggleSaved, isSaved } = useSaved();
  const navigate = useNavigate();

  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 🎤 Voice Search
  const startVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      setSearchTerm(event.results[0][0].transcript.toLowerCase());
    };

    recognition.start();
  };

  useEffect(() => {
    const lat = localStorage.getItem("lat");
    const lng = localStorage.getItem("lng");

    if (!lat || !lng) return;

    setLoading(true);

    discoverNearby({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius_meters: 5000,
    })
      .then(setProviders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <button onClick={() => navigate(-1)}>⬅ Back</button>

      <h2>Available Services</h2>

      {/* 🔍 Search */}
      <input
        type="text"
        placeholder="Search services..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <button onClick={startVoiceSearch}>🎤</button>

      <br /><br />

      {/* 🗺️ Go to Map */}
      <button onClick={() => navigate("/map")}>
        View Map
      </button>

      <ProviderList
        providers={providers.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.service_type.toLowerCase().includes(searchTerm)
        )}
        loading={loading}
        onViewDetails={setSelectedProviderId}
        onSaveToggle={(id, e) => {
          e?.stopPropagation();
          toggleSaved(id);
        }}
        isSaved={isSaved}
      />

      <ProviderDetailModal
        providerId={selectedProviderId}
        onClose={() => setSelectedProviderId(null)}
      />
    </section>
  );
}