import { useEffect, useState } from "react";
import { getProvider } from "../api";
import type { ProviderSummary } from "../types";
import { useSaved } from "../context/SavedContext";
import { ProviderCard } from "../components/ProviderCard";
import { ProviderDetailModal } from "../components/ProviderDetailModal";
import "./SavedPage.css";

export function SavedPage() {
  const { savedIds, toggleSaved } = useSaved();
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  useEffect(() => {
    const ids = [...savedIds];
    if (ids.length === 0) {
      setProviders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(ids.map((id) => getProvider(id)))
      .then((details) =>
        details.map((d) => ({
          ...d,
          distance_meters: null,
        }))
      )
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, [savedIds]);

  return (
    <div className="saved-page">
      <h1 className="page-title">Saved providers</h1>
      <p className="page-desc">
        Providers you’ve saved for quick access. Save from the discovery list or provider details.
      </p>
      {loading && <div className="saved-loading">Loading…</div>}
      {!loading && providers.length === 0 && (
        <div className="saved-empty">
          <p>No saved providers yet.</p>
          <p className="saved-empty-hint">Find nearby services on Home and save providers you like.</p>
        </div>
      )}
      {!loading && providers.length > 0 && (
        <ul className="saved-list">
          {providers.map((p) => (
            <li key={p.id}>
              <ProviderCard
                provider={p}
                onViewDetails={setSelectedProviderId}
                onSaveToggle={(id, e) => {
                  e?.stopPropagation();
                  toggleSaved(id);
                }}
                isSaved={true}
              />
            </li>
          ))}
        </ul>
      )}
      <ProviderDetailModal
        providerId={selectedProviderId}
        onClose={() => setSelectedProviderId(null)}
      />
    </div>
  );
}
