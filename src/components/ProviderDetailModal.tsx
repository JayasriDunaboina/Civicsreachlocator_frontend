import { useEffect, useState } from "react";
import { getProvider } from "../api";
import type { ProviderDetail } from "../types";
import { useSaved } from "../context/SavedContext";
import "./ProviderDetailModal.css";

interface ProviderDetailModalProps {
  providerId: string | null;
  onClose: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function ProviderDetailModal({ providerId, onClose }: ProviderDetailModalProps) {
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isSaved, toggleSaved } = useSaved();
  useEffect(() => {
    if (!providerId) {
      setProvider(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getProvider(providerId)
      .then(setProvider)
      .catch(() => setError("Could not load provider details."))
      .finally(() => setLoading(false));
  }, [providerId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (providerId) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [providerId, onClose]);

  if (!providerId) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          *
        </button>
        {loading && (
          <div className="modal-loading">Loading…</div>
        )}
        {error && (
          <div className="modal-error">
            <p>{error}</p>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
        {provider && !loading && (
          <>
            <h2 id="modal-title" className="modal-title">{provider.name}</h2>
            <div className="modal-header-meta">
              <span className="service-type-badge">{provider.service_type}</span>
              {provider.has_trust_badge && (
                <span className="trust-badge">✓ Community verified</span>
              )}
              <button
                type="button"
                className={`modal-save ${isSaved(provider.id) ? "saved" : ""}`}
                onClick={() => toggleSaved(provider.id)}
                title={isSaved(provider.id) ? "Remove from saved" : "Save provider"}
              >
                {isSaved(provider.id) ? "★ Saved" : "☆ Save"}
              </button>
            </div>
            {provider.area && <p className="modal-area">{provider.area}</p>}
            {provider.description && (
              <p className="modal-description">{provider.description}</p>
            )}
            {provider.address && (
              <p className="modal-address">{provider.address}</p>
            )}
            {provider.phone && (
              <p className="modal-phone">
                <a href={`tel:${provider.phone.replace(/\s/g, "")}`}>{provider.phone}</a>
              </p>
            )}
            {provider.services_offered.length > 0 && (
              <div className="modal-section">
                <h3>Services offered</h3>
                <ul>
                  {provider.services_offered.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {provider.opening_hours.length > 0 && (
              <div className="modal-section">
                <h3>Opening hours</h3>
                <ul>
                  {provider.opening_hours.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="modal-trust">
              <p>
                <strong>Trust score:</strong> {Math.round(provider.trust_score * 100)}%
              </p>
              <p>
                {provider.community_photos_count} community photos · {provider.confirmations_count} confirmations
              </p>
              {provider.years_in_business != null && (
                <p>{provider.years_in_business} years in business</p>
              )}
              {provider.last_verified && (
                <p>Last verified: {formatDate(provider.last_verified)}</p>
              )}
            </div>
            {provider.photo_urls.length > 0 && (
              <div className="modal-section">
                <h3>Photos</h3>
                <div className="modal-photos">
                  {provider.photo_urls.map((url, i) => (
                    <img key={i} src={url} alt="" />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
