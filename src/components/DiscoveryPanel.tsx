import type { LocationState } from "../types";
import "./DiscoveryPanel.css";

interface DiscoveryPanelProps {
  location: LocationState;
  onRequestLocation: () => void;
  radius: number;
  onRadiusChange: (m: number) => void;
  serviceTypes: string[];
  serviceFilter: string | null;
  onServiceFilterChange: (t: string | null) => void;
}

export function DiscoveryPanel({
  location,
  onRequestLocation,
  radius,
  onRadiusChange,
  serviceTypes,
  serviceFilter,
  onServiceFilterChange,
}: DiscoveryPanelProps) {
  return (
    <section className="discovery-panel">
      <h2 className="panel-title">Find nearby services</h2>

      {location.status === "idle" && (
        <div className="location-prompt">
          <p>Share your location to discover tailors, electricians, cobblers, and more nearby.</p>
          <button className="btn btn-primary" onClick={onRequestLocation}>
            Use my location
          </button>
        </div>
      )}

      {location.status === "requesting" && (
        <div className="location-prompt">
          <p className="muted">Getting your location…</p>
        </div>
      )}

      {(location.status === "denied" || location.status === "error") && (
        <div className="location-prompt error">
          <p>{location.message}</p>
          <button className="btn btn-secondary" onClick={onRequestLocation}>
            Try again
          </button>
        </div>
      )}

      {location.status === "ready" && (
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="radius">Within</label>
            <select
              id="radius"
              value={radius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
            >
              <option value={1000}>1 km</option>
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={25000}>25 km</option>
              <option value={50000}>50 km</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="service">Service type</label>
            <select
              id="service"
              value={serviceFilter ?? ""}
              onChange={(e) =>
                onServiceFilterChange(e.target.value ? e.target.value : null)
              }
            >
              <option value="">All</option>
              {serviceTypes.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </section>
  );
}
