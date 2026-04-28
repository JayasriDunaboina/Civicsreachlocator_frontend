import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function Routing() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(16.436, 81.684), // Start
        L.latLng(16.431, 81.688), // End
      ],
      lineOptions: {
        styles: [{ color: "blue", weight: 6 }],
      },
      createMarker: function (i, wp) {
        return L.marker(wp.latLng);
      },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: true, // IMPORTANT
    }).addTo(map);

    return () => {
      map.removeControl(routingControl);
    };
  }, [map]);

  return null;
}

export default function MapWithRoute() {
  return (
    <MapContainer
      center={[16.436, 81.684]}
      zoom={14}
      style={{ height: "500px", width: "100%" }} // IMPORTANT
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Routing />
    </MapContainer>
  );
}
