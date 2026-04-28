import type { ProviderSummary } from "../types";
import "./ProviderCard.css";

interface ProviderCardProps {
  provider: ProviderSummary;
  onViewDetails: (id: string) => void;
  onSaveToggle?: (id: string, e: React.MouseEvent) => void;
  isSaved?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ProviderCard({ 
  provider, 
  onViewDetails, 
  onSaveToggle, 
  isSaved 
}: ProviderCardProps) {
    const distance =
    provider.distance_meters != null
      ? provider.distance_meters < 1000
        ? `${Math.round(provider.distance_meters)} m`
        : `${(provider.distance_meters / 1000).toFixed(1)} km`
      : null;

  const hoursSummary =
    provider.opening_hours.length > 0 ? provider.opening_hours[0] : null;

  return (
    <article
      className="provider-card"
      onClick={() => onViewDetails(provider.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewDetails(provider.id);
        }
      }}
      aria-label={`View details for ${provider.name}`}
    >
      <div className="card-header">
        <h3 className="provider-name">{provider.name}</h3>
        {provider.has_trust_badge && (
          <span className="trust-badge" title="Community verified">
            ✓ Trusted
          </span>
        )}
        {onSaveToggle != null && (
          <button
            type="button"
            className={`card-save ${isSaved ? "saved" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onSaveToggle(provider.id, e);
            }}
            title={isSaved ? "Remove from saved" : "Save provider"}
            aria-label={isSaved ? "Remove from saved" : "Save provider"}
          >
            {isSaved ? "★" : "☆"}
          </button>
        )}
      </div>
      <p className="service-type">{provider.service_type}</p>
      {provider.area && <p className="area">{provider.area}</p>}
      {provider.description && (
        <p className="description">{provider.description}</p>
      )}
      {provider.address && (
        <p className="address">{provider.address}</p>
      )}
      {provider.services_offered.length > 0 && (
        <div className="services-tags">
          {provider.services_offered.slice(0, 4).map((s) => (
            <span key={s} className="tag">{s}</span>
          ))}
          {provider.services_offered.length > 4 && (
            <span className="tag more">+{provider.services_offered.length - 4}</span>
          )}
        </div>
      )}
      {hoursSummary && (
        <p className="opening-hours">{hoursSummary}</p>
      )}
      <div className="meta">
        {distance != null && <span className="distance">{distance} away</span>}
        <span className="trust-score">
          Trust: {Math.round(provider.trust_score * 100)}%
        </span>
        {provider.years_in_business != null && (
          <span className="years">{provider.years_in_business} yrs</span>
        )}
        {provider.last_verified && (
          <span className="verified">Verified {formatDate(provider.last_verified)}</span>
        )}
      </div>
      <div className="signals">
        {provider.community_photos_count} photos · {provider.confirmations_count} confirmations
      </div>
      <button type="button" className="card-action">
        View details
      </button>
    </article>
  );
}
