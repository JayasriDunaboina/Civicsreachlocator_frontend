// src/components/LocationMap.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to fit bounds to show all markers
function FitBounds({ markers }) {
  const map = useMap();
  
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  
  return null;
}

const LocationMap = ({ startLocation, endLocation, onLocationSelect }) => {
  const [markers, setMarkers] = useState([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [linePoints, setLinePoints] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);

  // Add marker on map click
  const handleMapClick = (e) => {
    if (drawingMode) {
      const { lat, lng } = e.latlng;
      const newPoint = { lat, lng, name: `Point ${markers.length + 1}` };
      
      if (startPoint === null) {
        setStartPoint(newPoint);
        setMarkers([...markers, { ...newPoint, type: 'start' }]);
        onLocationSelect('start', newPoint);
      } else if (endPoint === null) {
        setEndPoint(newPoint);
        setMarkers([...markers, { ...newPoint, type: 'end' }]);
        onLocationSelect('end', newPoint);
      } else {
        // Reset and start over
        resetLocations();
        setStartPoint(newPoint);
        setMarkers([{ ...newPoint, type: 'start' }]);
        onLocationSelect('start', newPoint);
      }
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  // Estimate travel duration (assuming 30 km/h average speed)
  const estimateDuration = (distance) => {
    const avgSpeed = 30; // km/h
    const hours = distance / avgSpeed;
    const minutes = Math.round(hours * 60);
    return minutes;
  };

  // Reset all locations
  const resetLocations = () => {
    setStartPoint(null);
    setEndPoint(null);
    setMarkers([]);
    setDistance(null);
    setDuration(null);
    setLinePoints([]);
  };

  // Clear current line
  const clearLine = () => {
    setLinePoints([]);
    setDistance(null);
    setDuration(null);
  };

  // Calculate when both points are selected
  useEffect(() => {
    if (startPoint && endPoint) {
      const dist = calculateDistance(startPoint, endPoint);
      const dur = estimateDuration(dist);
      setDistance(dist.toFixed(2));
      setDuration(dur);
      setLinePoints([[startPoint.lat, startPoint.lng], [endPoint.lat, endPoint.lng]]);
    } else {
      setLinePoints([]);
      setDistance(null);
      setDuration(null);
    }
  }, [startPoint, endPoint]);

  return (
    <div className="location-map-container">
      <div className="map-controls">
        <button 
          onClick={() => setDrawingMode(!drawingMode)}
          className={`map-btn ${drawingMode ? 'active' : ''}`}
        >
          {drawingMode ? '✏️ Drawing Mode ON' : '✏️ Draw Line Mode'}
        </button>
        
        {drawingMode && (
          <div className="drawing-instructions">
            <p>📌 Click on map to place:</p>
            <ol>
              <li>First click: <span className="start-color">Start Location (Green)</span></li>
              <li>Second click: <span className="end-color">End Location (Red)</span></li>
            </ol>
            <button onClick={resetLocations} className="reset-btn">
              🔄 Reset All
            </button>
            <button onClick={clearLine} className="clear-btn">
              🧹 Clear Line
            </button>
          </div>
        )}

        {distance && duration && (
          <div className="distance-info">
            <div className="info-card">
              <h3>📍 Distance Information</h3>
              <p><strong>Distance:</strong> {distance} km</p>
              <p><strong>Estimated Travel Time:</strong> {duration} minutes</p>
              <p><strong>Walking:</strong> ~{Math.round(duration * 2)} minutes</p>
              <p><strong>Driving:</strong> ~{Math.round(duration / 2)} minutes</p>
            </div>
          </div>
        )}
      </div>

      <MapContainer
        center={[20.5937, 78.9629]} // Center of India
        zoom={5}
        style={{ height: '500px', width: '100%', borderRadius: '12px' }}
        onClick={handleMapClick}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Markers */}
        {markers.map((marker, idx) => (
          <Marker
            key={idx}
            position={[marker.lat, marker.lng]}
            icon={marker.type === 'start' ? homeIcon : destinationIcon}
          >
            <Popup>
              <div className="popup-content">
                <strong>{marker.type === 'start' ? '📍 Start Location' : '🏁 Destination'}</strong>
                <p>Lat: {marker.lat.toFixed(4)}</p>
                <p>Lng: {marker.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Line between points */}
        {linePoints.length > 0 && (
          <Polyline
            positions={linePoints}
            color="blue"
            weight={3}
            opacity={0.8}
            dashArray="5, 10"
          />
        )}

        <FitBounds markers={markers.map(m => ({ lat: m.lat, lng: m.lng }))} />
      </MapContainer>
    </div>
  );
};

export default LocationMap;