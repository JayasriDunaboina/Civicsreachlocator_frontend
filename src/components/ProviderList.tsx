import type { ProviderSummary } from "../types";
import { ProviderCard } from "./ProviderCard";
import "./ProviderList.css";

interface ProviderListProps {
  providers: ProviderSummary[];
  loading: boolean;
  onViewDetails: (id: string) => void;
  onSaveToggle?: (id: string, e: React.MouseEvent) => void;
  isSaved?: (id: string) => boolean;
}

export function ProviderList({ providers, loading, onViewDetails, onSaveToggle, isSaved }: ProviderListProps) {
  if (loading) {
    return (
      <section className="provider-list">
        <h2 className="list-title">Nearby providers</h2>
        <div className="loading">Loading…</div>
      </section>
    );
  }

  if (providers.length === 0) {
    return (
      <section className="provider-list">
        <h2 className="list-title">Nearby providers</h2>
        <div className="empty">
          <p>No providers in this area yet. Try a larger search radius or allow location access.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="provider-list">
      <h2 className="list-title">
        Nearby providers <span className="count">({providers.length})</span>
      </h2>
      <ul className="cards">
        {providers.map((p) => (
          <li key={p.id}>
            <ProviderCard
              provider={p}
              onViewDetails={onViewDetails}
              onSaveToggle={onSaveToggle}
              isSaved={isSaved?.(p.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
