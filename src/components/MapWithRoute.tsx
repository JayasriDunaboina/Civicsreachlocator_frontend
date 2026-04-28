import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

// Fix marker icon issue (cast to any to bypass missing type)
(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function Routing() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Dynamically import leaflet-routing-machine to avoid TS errors
    import("leaflet-routing-machine").then((LRM) => {
      const routingControl = (LRM as any).control({
        waypoints: [
          L.latLng(16.436, 81.684),
          L.latLng(16.431, 81.688),
        ],
        lineOptions: {
          styles: [{ color: "blue", weight: 6 }],
        },
        createMarker: (_i: number, wp: any) => L.marker(wp.latLng),
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: true,
      }).addTo(map);

      return () => {
        map.removeControl(routingControl);
      };
    });
  }, [map]);

  return null;
}

export default function MapWithRoute() {
  return (
    <MapContainer
      center={[16.436, 81.684]}
      zoom={14}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Routing />
    </MapContainer>
  );
}
