// src/App.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import { useAuth } from './context/AuthContext';
import './App.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Distance calculation function
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Route Map Component with Voice Navigation
function RouteMap({ service, userLocation }) {
  const [distance, setDistance] = useState(null);
  const [travelTime, setTravelTime] = useState(null);
  const [mapCenter, setMapCenter] = useState([16.4333, 81.7000]);
  const [mapZoom, setMapZoom] = useState(14);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentDirection, setCurrentDirection] = useState(null);
  const [voiceSpeed, setVoiceSpeed] = useState(0.9);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(true);
  const [announcementLog, setAnnouncementLog] = useState([]);
  const [prevUserLocation, setPrevUserLocation] = useState(null);
  const [wrongDirectionCount, setWrongDirectionCount] = useState(0);
  const [lastWarningTime, setLastWarningTime] = useState(0);

  // Calculate bearing between two points
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
  };

  // Get cardinal direction from bearing
  const getCardinalDirection = (bearing) => {
    const directions = [
      { name: 'North', range: [0, 22.5], icon: '⬆️' },
      { name: 'Northeast', range: [22.5, 67.5], icon: '↗️' },
      { name: 'East', range: [67.5, 112.5], icon: '➡️' },
      { name: 'Southeast', range: [112.5, 157.5], icon: '↘️' },
      { name: 'South', range: [157.5, 202.5], icon: '⬇️' },
      { name: 'Southwest', range: [202.5, 247.5], icon: '↙️' },
      { name: 'West', range: [247.5, 292.5], icon: '⬅️' },
      { name: 'Northwest', range: [292.5, 337.5], icon: '↖️' }
    ];
    
    for (const dir of directions) {
      if (bearing >= dir.range[0] && bearing < dir.range[1]) {
        return dir;
      }
    }
    return { name: 'North', icon: '⬆️' };
  };

  // Check if user is moving in the correct direction
  const checkDirection = (currentLocation, previousLocation, destinationLocation) => {
    if (!previousLocation) return { isWrongDirection: false, isMovingAway: false };
    
    // Calculate user's movement direction
    const userBearing = calculateBearing(
      previousLocation.lat, previousLocation.lng,
      currentLocation.lat, currentLocation.lng
    );
    
    // Calculate correct direction to destination
    const correctBearing = calculateBearing(
      currentLocation.lat, currentLocation.lng,
      destinationLocation.lat, destinationLocation.lng
    );
    
    // Calculate the angle difference
    let diff = Math.abs(correctBearing - userBearing);
    if (diff > 180) diff = 360 - diff;
    
    const isWrongDirection = diff > 90;
    
    // Calculate distance change
    const prevDistance = calculateDistance(
      previousLocation.lat, previousLocation.lng,
      destinationLocation.lat, destinationLocation.lng
    );
    const currentDistance = calculateDistance(
      currentLocation.lat, currentLocation.lng,
      destinationLocation.lat, destinationLocation.lng
    );
    
    const isMovingAway = currentDistance > prevDistance;
    
    return {
      isWrongDirection,
      isMovingAway,
      diff,
      userDirection: getCardinalDirection(userBearing),
      correctDirection: getCardinalDirection(correctBearing)
    };
  };

  // Speak warning for wrong direction
  const warnWrongDirection = (userDir, correctDir, isMovingAway) => {
    const now = Date.now();
    if (now - lastWarningTime < 10000) return;
    
    setLastWarningTime(now);
    
    let warningMessage = '';
    if (isMovingAway) {
      warningMessage = `⚠️ Warning! You are moving away from your destination. You are heading ${userDir.name}, but you should be heading ${correctDir.name}. Please turn around.`;
    } else {
      warningMessage = `⚠️ You are going in the wrong direction. You are heading ${userDir.name}, but your destination is ${correctDir.name}. Please adjust your direction.`;
    }
    
    speak(warningMessage, true);
    setWrongDirectionCount(prev => prev + 1);
  };

  // Speech function
  const speak = (text, priority = true) => {
    if (!voiceEnabled) return;
    
    try {
      if (priority && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSpeed;
      utterance.pitch = 1;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setAnnouncementLog(prev => [...prev, { time: new Date().toLocaleTimeString(), text }]);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Speech error:", error);
    }
  };

  // Generate detailed navigation steps
  const generateDetailedSteps = (startLat, startLng, endLat, endLng, totalDist, serviceName, serviceAddress) => {
    const bearing = calculateBearing(startLat, startLng, endLat, endLng);
    const direction = getCardinalDirection(bearing);
    const steps = [];
    
    steps.push({
      id: 0,
      instruction: `Start your journey heading ${direction.name}. You will travel approximately ${totalDist.toFixed(1)} kilometers to reach ${serviceName}.`,
      shortInstruction: `Head ${direction.name}`,
      direction: direction.name,
      directionIcon: direction.icon,
      distance: totalDist.toFixed(2),
      type: 'start'
    });
    
    steps.push({
      id: 1,
      instruction: `Continue heading ${direction.name}. Your destination is ${totalDist.toFixed(1)} kilometers ahead.`,
      shortInstruction: `Continue ${direction.name}`,
      direction: direction.name,
      directionIcon: direction.icon,
      distance: totalDist.toFixed(2),
      type: 'continue'
    });
    
    steps.push({
      id: 2,
      instruction: `You have arrived at your destination. ${serviceName} at ${serviceAddress} is on your ${direction.name === 'North' ? 'right' : direction.name === 'South' ? 'left' : 'side'}.`,
      shortInstruction: `Arrived at ${serviceName}`,
      direction: direction.name,
      directionIcon: '🏁',
      distance: "0",
      type: 'arrival'
    });
    
    return steps;
  };

  // Get real road route
  const getRealRoute = async (startLat, startLng, endLat, endLng) => {
    setLoading(true);
    setRouteError(null);
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const response = await axios.get(url);
      
      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const geometry = route.geometry.coordinates;
        const points = geometry.map(coord => [coord[1], coord[0]]);
        
        setRouteGeometry(points);
        const routeDistance = (route.distance / 1000);
        setDistance(routeDistance.toFixed(2));
        const minutes = Math.round(route.duration / 60);
        setTravelTime(minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)} hr ${minutes%60} min`);
        
        const steps = generateDetailedSteps(startLat, startLng, endLat, endLng, routeDistance, service.name, service.address);
        setNavigationSteps(steps);
        setCurrentDirection(steps[0].direction);
        
        if (points.length > 0) {
          const bounds = L.latLngBounds(points);
          const center = bounds.getCenter();
          setMapCenter([center.lat, center.lng]);
          setMapZoom(13);
        }
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('Routing error:', error);
      setRouteError('Using straight line navigation');
      const straightLine = [[startLat, startLng], [endLat, endLng]];
      setRouteGeometry(straightLine);
      const dist = calculateDistance(startLat, startLng, endLat, endLng);
      setDistance(dist.toFixed(2));
      const minutes = Math.round((dist / 30) * 60);
      setTravelTime(minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)} hr ${minutes%60} min`);
      
      const steps = generateDetailedSteps(startLat, startLng, endLat, endLng, dist, service.name, service.address);
      setNavigationSteps(steps);
      setCurrentDirection(steps[0].direction);
    } finally {
      setLoading(false);
    }
  };

  // Monitor user movement for wrong direction
  useEffect(() => {
    if (isNavigating && userLocation && service) {
      if (prevUserLocation) {
        const directionCheck = checkDirection(userLocation, prevUserLocation, service.coordinates);
        
        if (directionCheck.isWrongDirection || directionCheck.isMovingAway) {
          warnWrongDirection(directionCheck.userDirection, directionCheck.correctDirection, directionCheck.isMovingAway);
        }
      }
      setPrevUserLocation(userLocation);
    }
  }, [userLocation, isNavigating, service]);

  // Voice Navigation Functions
  const startVoiceNavigation = () => {
    if (!navigationSteps.length) return;
    setIsNavigating(true);
    setCurrentStep(0);
    setPrevUserLocation(userLocation);
    setWrongDirectionCount(0);
    speak(navigationSteps[0].instruction);
  };
  
  const nextStep = () => {
    if (currentStep + 1 < navigationSteps.length) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      speak(navigationSteps[nextIndex].instruction);
    } else {
      speak("You have reached your destination. Thank you for using CivicReach Locator.");
      setIsNavigating(false);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      speak(navigationSteps[prevIndex].instruction);
    }
  };
  
  const repeatInstruction = () => {
    if (navigationSteps[currentStep]) {
      speak(navigationSteps[currentStep].instruction);
    }
  };
  
  const announceCurrentDirection = () => {
    const bearing = calculateBearing(userLocation.lat, userLocation.lng, service.coordinates.lat, service.coordinates.lng);
    const direction = getCardinalDirection(bearing);
    const dist = calculateDistance(userLocation.lat, userLocation.lng, service.coordinates.lat, service.coordinates.lng);
    speak(`You are heading ${direction.name}. Your destination ${service.name} is ${dist.toFixed(1)} kilometers away.`);
  };
  
  const stopVoiceNavigation = () => {
    window.speechSynthesis.cancel();
    setIsNavigating(false);
    setCurrentStep(0);
    setIsSpeaking(false);
    setPrevUserLocation(null);
    setWrongDirectionCount(0);
  };
  
  const clearLog = () => setAnnouncementLog([]);

  useEffect(() => {
    if (userLocation && service) {
      getRealRoute(
        userLocation.lat, userLocation.lng,
        service.coordinates.lat, service.coordinates.lng
      );
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [userLocation, service]);

  if (!userLocation || !service) {
    return (
      <div className="info-message-full">
        <div className="info-content">
          <div className="info-icon">🗺️</div>
          <h3>Route Map</h3>
          <p>Select a service to see the route on map</p>
        </div>
      </div>
    );
  }

  const bearing = calculateBearing(userLocation.lat, userLocation.lng, service.coordinates.lat, service.coordinates.lng);
  const mainDirection = getCardinalDirection(bearing);

  return (
    <div className="route-map-full">
      {/* Voice Navigation Panel */}
      <div className="voice-nav-panel">
        <div className="voice-panel-header" onClick={() => setShowVoicePanel(!showVoicePanel)}>
          <div className="voice-icon">🎤</div>
          <h3>Voice Navigation</h3>
          <label className="voice-toggle">
            <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} />
            <span>Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
          </label>
          <button className="toggle-panel-btn">{showVoicePanel ? '▼' : '▲'}</button>
        </div>
        
        {showVoicePanel && (
          <div className="voice-panel-content">
            <div className="voice-speed-control">
              <span>🗣️ Speed:</span>
              <select value={voiceSpeed} onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}>
                <option value="0.7">🐢 Slow</option>
                <option value="0.9">⚡ Normal</option>
                <option value="1.1">🚀 Fast</option>
              </select>
              {isSpeaking && <span className="speaking-badge">🔊 Speaking...</span>}
            </div>
            
            <div className="nav-buttons">
              <button className="nav-btn start-btn" onClick={startVoiceNavigation} disabled={isNavigating}>
                🎯 Start Navigation
              </button>
              <button className="nav-btn stop-btn" onClick={stopVoiceNavigation} disabled={!isNavigating}>
                ⏹️ Stop
              </button>
              <button className="nav-btn repeat-btn" onClick={repeatInstruction} disabled={!isNavigating}>
                🔁 Repeat
              </button>
              <button className="nav-btn direction-btn" onClick={announceCurrentDirection} disabled={!isNavigating}>
                🧭 Direction
              </button>
              <button className="nav-btn prev-btn" onClick={prevStep} disabled={!isNavigating || currentStep === 0}>
                ◀ Prev Step
              </button>
              <button className="nav-btn next-btn" onClick={nextStep} disabled={!isNavigating}>
                Next Step ▶
              </button>
            </div>
            
            {isNavigating && navigationSteps[currentStep] && (
              <div className="current-status">
                <div className="direction-badge">{mainDirection.icon} {mainDirection.name}</div>
                <div className="step-info">Step {currentStep + 1} of {navigationSteps.length}</div>
                <div className="current-instruction">{navigationSteps[currentStep].shortInstruction}</div>
                {wrongDirectionCount > 0 && (
                  <div className="warning-badge">
                    ⚠️ Direction Alert: {wrongDirectionCount}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Panel */}
      <div className="route-stats-panel">
        <div className="stats-container">
          <div className="stat-card-full">
            <div className="stat-icon-large">📏</div>
            <div className="stat-info">
              <div className="stat-value-large">{distance || '--'} km</div>
              <div className="stat-label-large">Distance</div>
            </div>
          </div>
          <div className="stat-card-full">
            <div className="stat-icon-large">⏱️</div>
            <div className="stat-info">
              <div className="stat-value-large">{travelTime || '--'}</div>
              <div className="stat-label-large">Travel Time</div>
            </div>
          </div>
          <div className="stat-card-full">
            <div className="stat-icon-large">🧭</div>
            <div className="stat-info">
              <div className="stat-value-large">{mainDirection.name}</div>
              <div className="stat-label-large">Direction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="map-full-container">
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Calculating route...</p>
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '500px', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>
                <strong>📍 Your Location</strong><br />
                Lat: {userLocation.lat.toFixed(4)}<br />
                Lng: {userLocation.lng.toFixed(4)}
              </Popup>
            </Marker>
            
            <Marker position={[service.coordinates.lat, service.coordinates.lng]}>
              <Popup>
                <strong>{service.name}</strong><br />
                {service.address}<br />
                ⭐ {service.rating} ({service.reviews} reviews)<br />
                📞 {service.phone}
              </Popup>
            </Marker>
            
            {routeGeometry.length > 0 && (
              <Polyline 
                positions={routeGeometry} 
                pathOptions={{ color: '#007bff', weight: 5, opacity: 0.8 }} 
              />
            )}
          </MapContainer>
        )}
      </div>

      {/* Step-by-Step Directions */}
      <div className="directions-full">
        <div className="directions-header">
          <h4>🗺️ Step-by-Step Directions</h4>
          <span className="directions-distance">{distance} km · {travelTime}</span>
        </div>
        <div className="directions-list">
          {navigationSteps.map((step, idx) => (
            <div 
              key={idx} 
              className={`direction-step-card ${currentStep === idx && isNavigating ? 'active-step' : ''} step-${step.type}`}
              onClick={() => { setCurrentStep(idx); speak(step.instruction); }}
            >
              <div className="step-number">{idx + 1}</div>
              <div className="step-icon-large">{step.directionIcon}</div>
              <div className="step-content">
                <div className="step-instruction">{step.instruction}</div>
                <div className="step-details">
                  <span className="step-distance">{step.distance} km</span>
                  <span className="step-direction">→ {step.direction}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Service Contact Info */}
        <div className="service-contact-info">
          <div className="contact-row">
            <span className="contact-icon">📍</span>
            <span className="contact-text"><strong>Start:</strong> Your Current Location</span>
          </div>
          <div className="contact-row">
            <span className="contact-icon">🏁</span>
            <span className="contact-text"><strong>Destination:</strong> {service.name}</span>
          </div>
          <div className="contact-row">
            <span className="contact-icon">🏠</span>
            <span className="contact-text">{service.address}</span>
          </div>
          <div className="contact-row">
            <span className="contact-icon">📞</span>
            <span className="contact-text"><strong>Contact:</strong> {service.phone}</span>
          </div>
          <div className="contact-row">
            <span className="contact-icon">⭐</span>
            <span className="contact-text">Rating: {service.rating} ({service.reviews} reviews)</span>
          </div>
        </div>
        
        {routeError && (
          <div className="route-error">
            <span>⚠️</span> {routeError}
          </div>
        )}

        {/* Announcement Log */}
        {announcementLog.length > 0 && (
          <div className="announcement-log">
            <div className="log-header">
              <h5>📢 Voice Announcements</h5>
              <button className="clear-log-btn" onClick={clearLog}>Clear</button>
            </div>
            <div className="log-list">
              {announcementLog.map((log, idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-time">{log.time}</span>
                  <span className="log-text">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Service Providers
const baseProviders = [
  {
    id: 1, name: "Electric Maintenance", type: "electrician", typeIcon: "⚡",
    services: ["Street light installation", "Repair services", "Maintenance"],
    description: "Professional electrical services",
    address: "Electric Office, Main Road, Narasapuram",
    rating: 4.5, reviews: 128, phone: "+91 98765 43210", hours: "9 AM - 8 PM",
    verified: true, communityTrust: 70, availability: "Available Now", priceRange: "$$",
    coordinates: { lat: 16.4360, lng: 81.7030 }
  },
  {
    id: 2, name: "Quick Fix Tailor", type: "tailor", typeIcon: "👔",
    services: ["Alterations", "Stitching", "Wedding Gowns"],
    description: "Expert tailoring services",
    address: "Gandhi Street, Narasapuram",
    rating: 4.5, reviews: 128, phone: "+91 98765 43211", hours: "9 AM - 8 PM",
    verified: true, communityTrust: 95, availability: "Available Now", priceRange: "$$",
    coordinates: { lat: 16.4310, lng: 81.6970 }
  },
  {
    id: 3, name: "Spark Electric Solutions", type: "electrician", typeIcon: "⚡",
    services: ["Wiring", "Emergency Repairs", "Panel Upgrades"],
    description: "24/7 emergency electrical services",
    address: "Church Street, Narasapuram",
    rating: 4.8, reviews: 342, phone: "+91 98765 43212", hours: "24/7 Emergency",
    verified: true, communityTrust: 98, availability: "Emergency Service", priceRange: "$$$",
    coordinates: { lat: 16.4350, lng: 81.7005 }
  },
  {
    id: 4, name: "Sole Healers Cobbler", type: "cobbler", typeIcon: "👞",
    services: ["Shoe Repair", "Bag Repair", "Key Cutting"],
    description: "Quality shoe and bag repair",
    address: "Market Street, Narasapuram",
    rating: 4.3, reviews: 89, phone: "+91 98765 43213", hours: "10 AM - 7 PM",
    verified: false, communityTrust: 92, availability: "Open Now", priceRange: "$",
    coordinates: { lat: 16.4335, lng: 81.6990 }
  },
  {
    id: 5, name: "Precision Tailoring", type: "tailor", typeIcon: "👔",
    services: ["Custom Suits", "Bridal Wear", "Alterations"],
    description: "Premium custom tailoring",
    address: "Railway Station Road, Narasapuram",
    rating: 4.9, reviews: 567, phone: "+91 98765 43214", hours: "9 AM - 9 PM",
    verified: true, communityTrust: 99, availability: "Booked until 3 PM", priceRange: "$$$",
    coordinates: { lat: 16.4300, lng: 81.7025 }
  },
  {
    id: 6, name: "24/7 Emergency Electrician", type: "electrician", typeIcon: "⚡",
    services: ["Emergency", "Power Outage", "Wiring"],
    description: "Round-the-clock emergency services",
    address: "Hospital Road, Narasapuram",
    rating: 4.6, reviews: 233, phone: "+91 98765 43215", hours: "24/7",
    verified: true, communityTrust: 94, availability: "Always Open", priceRange: "$$$",
    coordinates: { lat: 16.4380, lng: 81.6945 }
  },
  {
    id: 7, name: "Narasapuram Government Hospital", type: "hospital", typeIcon: "🏥",
    services: ["Emergency Care", "General Medicine", "Surgery", "Maternity", "Pharmacy"],
    description: "24/7 Government Hospital",
    address: "Hospital Road, Narasapuram",
    rating: 4.4, reviews: 456, phone: "+91 98765 43216", hours: "24/7",
    verified: true, communityTrust: 88, availability: "Open 24/7", priceRange: "Free", emergency: true,
    coordinates: { lat: 16.4370, lng: 81.6960 }
  },
  {
    id: 8, name: "Sri Sai Multi-Specialty Hospital", type: "hospital", typeIcon: "🏥",
    services: ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "ICU"],
    description: "Advanced multi-specialty hospital",
    address: "Main Road, Near Bus Stand, Narasapuram",
    rating: 4.7, reviews: 389, phone: "+91 98765 43217", hours: "24/7",
    verified: true, communityTrust: 91, availability: "Open 24/7", priceRange: "$$$", emergency: true,
    coordinates: { lat: 16.4345, lng: 81.7010 }
  },
  {
    id: 9, name: "Narasapuram Area Hospital", type: "hospital", typeIcon: "🏥",
    services: ["Outpatient", "Inpatient", "Laboratory", "X-Ray", "Ambulance"],
    description: "Government area hospital",
    address: "College Road, Narasapuram",
    rating: 4.2, reviews: 234, phone: "+91 98765 43218", hours: "24/7",
    verified: true, communityTrust: 85, availability: "Open 24/7", priceRange: "Free", emergency: true,
    coordinates: { lat: 16.4325, lng: 81.6980 }
  },
  {
    id: 10, name: "Narasapuram Police Station", type: "police", typeIcon: "👮",
    services: ["Law Enforcement", "Emergency Response", "Filing Complaints", "Community Policing"],
    description: "Main police station",
    address: "Police Station Road, Near Court, Narasapuram",
    rating: 4.3, reviews: 167, phone: "+91 98765 43219", hours: "24/7",
    verified: true, communityTrust: 87, availability: "Open 24/7", priceRange: "Free", emergency: true,
    coordinates: { lat: 16.4355, lng: 81.6985 }
  },
  {
    id: 11, name: "Traffic Police Station", type: "police", typeIcon: "👮",
    services: ["Traffic Management", "Vehicle Registration", "Driving License", "Traffic Fines"],
    description: "Traffic police station",
    address: "Bus Stand Complex, Narasapuram",
    rating: 4.1, reviews: 98, phone: "+91 98765 43220", hours: "9 AM - 9 PM",
    verified: true, communityTrust: 82, availability: "Open Now", priceRange: "Free", emergency: false,
    coordinates: { lat: 16.4340, lng: 81.7020 }
  },
  {
    id: 12, name: "Women's Police Station", type: "police", typeIcon: "👮‍♀️",
    services: ["Women Safety", "Domestic Violence Support", "Child Protection", "Counseling"],
    description: "Specialized police station for women",
    address: "Collectorate Road, Narasapuram",
    rating: 4.6, reviews: 145, phone: "+91 98765 43221", hours: "24/7",
    verified: true, communityTrust: 93, availability: "Open 24/7", priceRange: "Free", emergency: true,
    coordinates: { lat: 16.4365, lng: 81.6975 }
  },
  {
    id: 13, name: "Narasapuram Head Post Office", type: "postoffice", typeIcon: "📮",
    services: ["Mail Services", "Parcel Delivery", "Money Orders", "Savings Bank", "Passport Services"],
    description: "Main head post office",
    address: "Post Office Road, Near Railway Station, Narasapuram",
    rating: 4.4, reviews: 234, phone: "+91 98765 43222", hours: "9 AM - 6 PM",
    verified: true, communityTrust: 90, availability: "Open Now", priceRange: "$", emergency: false,
    coordinates: { lat: 16.4320, lng: 81.6995 }
  },
  {
    id: 14, name: "Main Bazaar Post Office", type: "postoffice", typeIcon: "📮",
    services: ["Mail", "Parcel", "Speed Post", "Registered Post", "Aadhaar Services"],
    description: "Branch post office in main market",
    address: "Main Bazaar, Narasapuram",
    rating: 4.2, reviews: 156, phone: "+91 98765 43223", hours: "9:30 AM - 5:30 PM",
    verified: true, communityTrust: 86, availability: "Open Now", priceRange: "$", emergency: false,
    coordinates: { lat: 16.4340, lng: 81.7000 }
  },
  {
    id: 15, name: "Gandhi Nagar Post Office", type: "postoffice", typeIcon: "📮",
    services: ["Mail", "Parcel", "Insurance", "Postal Banking", "E-post"],
    description: "Post office serving Gandhi Nagar area",
    address: "Gandhi Nagar, Narasapuram",
    rating: 4.0, reviews: 89, phone: "+91 98765 43224", hours: "9 AM - 5 PM",
    verified: true, communityTrust: 84, availability: "Open Now", priceRange: "$", emergency: false,
    coordinates: { lat: 16.4375, lng: 81.6950 }
  }
];

function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(5);
  const [serviceType, setServiceType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedProviders, setSavedProviders] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading');
  const [locationMessage, setLocationMessage] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [sortBy, setSortBy] = useState('distance');
  const [filters, setFilters] = useState({ 
    verified: false, 
    emergency: false, 
    openNow: false, 
    minRating: 0, 
    priceRange: 'all' 
  });

  const openAuthModal = (mode = 'login') => { 
    setAuthMode(mode); 
    setShowAuthModal(true); 
  };

  const updateProviderDistances = (location, providersList) => {
    return providersList.map(provider => ({
      ...provider,
      distance: parseFloat(calculateDistance(location.lat, location.lng, provider.coordinates.lat, provider.coordinates.lng).toFixed(2))
    }));
  };

  useEffect(() => { 
    loadSavedProviders(); 
    getUserLocation(); 
  }, []);

  const loadProvidersWithLocation = (location) => {
    setLoading(true);
    setTimeout(() => {
      const providersWithDistance = updateProviderDistances(location, baseProviders);
      setProviders(providersWithDistance);
      setFilteredProviders(providersWithDistance);
      setLoading(false);
    }, 500);
  };

  const loadSavedProviders = () => {
    const saved = localStorage.getItem('savedProviders');
    if (saved) setSavedProviders(JSON.parse(saved));
  };

  const getUserLocation = () => {
    setLocationStatus('loading');
    setLocationMessage('Getting your location...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(location);
          loadProvidersWithLocation(location);
          setLocationStatus('success');
          setLocationMessage('📍 Location detected!');
          setTimeout(() => setLocationMessage(''), 3000);
        },
        () => {
          const defaultLocation = { lat: 16.4333, lng: 81.7000 };
          setUserLocation(defaultLocation);
          loadProvidersWithLocation(defaultLocation);
          setLocationStatus('default');
          setLocationMessage('📍 Using default location (Narasapuram)');
          setTimeout(() => setLocationMessage(''), 4000);
        }
      );
    } else {
      const defaultLocation = { lat: 16.4333, lng: 81.7000 };
      setUserLocation(defaultLocation);
      loadProvidersWithLocation(defaultLocation);
      setLocationStatus('default');
      setLocationMessage('📍 Using default location');
      setTimeout(() => setLocationMessage(''), 4000);
    }
  };

  const updateLocation = () => getUserLocation();

  useEffect(() => {
    if (!providers.length) return;
    let filtered = [...providers];
    filtered = filtered.filter(p => p.distance <= radius);
    if (serviceType !== 'all') filtered = filtered.filter(p => p.type === serviceType);
    if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
    if (filters.verified) filtered = filtered.filter(p => p.verified);
    if (filters.emergency) filtered = filtered.filter(p => p.emergency);
    if (filters.openNow) filtered = filtered.filter(p => p.availability.includes('Open') || p.availability.includes('Available'));
    if (filters.minRating > 0) filtered = filtered.filter(p => p.rating >= filters.minRating);
    if (filters.priceRange !== 'all') filtered = filtered.filter(p => p.priceRange === filters.priceRange);
    if (sortBy === 'distance') filtered.sort((a, b) => a.distance - b.distance);
    else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'trust') filtered.sort((a, b) => b.communityTrust - a.communityTrust);
    setFilteredProviders(filtered);
  }, [providers, radius, serviceType, searchQuery, filters, sortBy]);

  const toggleSave = (provider) => {
    if (!isAuthenticated) { 
      alert('Please login to save providers'); 
      openAuthModal('login'); 
      return; 
    }
    let updated;
    if (savedProviders.find(p => p.id === provider.id)) {
      updated = savedProviders.filter(p => p.id !== provider.id);
    } else {
      updated = [...savedProviders, provider];
    }
    setSavedProviders(updated);
    localStorage.setItem('savedProviders', JSON.stringify(updated));
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return (
          <div>
            <div className="hero-section">
              <h1>CivicReach Locator</h1>
              <p>Find trusted local services in Narasapuram, Andhra Pradesh</p>
              {!isAuthenticated ? (
                <div className="auth-prompt">
                  <button className="auth-prompt-btn" onClick={() => openAuthModal('login')}>🔐 Sign In</button>
                  <button className="auth-prompt-btn register" onClick={() => openAuthModal('register')}>📝 Register</button>
                </div>
              ) : (
                <div className="welcome-message">👋 Welcome back, {user?.name}!</div>
              )}
              {locationMessage && <div className={`location-message ${locationStatus}`}>{locationMessage}</div>}
              <div className="search-container">
                <input type="text" placeholder="Search for hospitals, police stations, post offices, electricians..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
              </div>
            </div>
            <div className="stats-bar">
              <div className="stat-item"><span className="stat-number">{providers.length}</span><span>Total Services</span></div>
              <div className="stat-item"><span className="stat-number">4.4</span><span>Avg Rating</span></div>
              <div className="stat-item"><span className="stat-number">3,500+</span><span>Reviews</span></div>
              <div className="stat-item"><span className="stat-number">94%</span><span>Satisfaction</span></div>
            </div>
            <div className="filters-section">
              <div className="filter-row">
                <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                  <option value={1}>Within 1 km</option>
                  <option value={2}>Within 2 km</option>
                  <option value={3}>Within 3 km</option>
                  <option value={5}>Within 5 km</option>
                  <option value={10}>Within 10 km</option>
                  <option value={10}>Within 20 km</option>
                  <option value={10}>Within 30 km</option>
                  <option value={10}>Within 40 km</option>
                </select>
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                  <option value="all">All Services</option>
                  <option value="electrician">⚡ Electricians</option>
                  <option value="tailor">👔 Tailors</option>
                  <option value="cobbler">👞 Cobblers</option>
                  <option value="hospital">🏥 Hospitals</option>
                  <option value="police">👮 Police Stations</option>
                  <option value="postoffice">📮 Post Offices</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="distance">Sort by Distance</option>
                  <option value="rating">Sort by Rating</option>
                  <option value="trust">Sort by Trust</option>
                </select>
                <button onClick={() => setShowFilters(!showFilters)}>⚙️ Filters</button>
                <button className="location-button" onClick={updateLocation} disabled={locationStatus === 'loading'}>📍 Use My Location</button>
              </div>
              {showFilters && (
                <div className="advanced-filters">
                  <label><input type="checkbox" checked={filters.verified} onChange={(e) => setFilters({...filters, verified: e.target.checked})} /> ✅ Verified Only</label>
                  <label><input type="checkbox" checked={filters.emergency} onChange={(e) => setFilters({...filters, emergency: e.target.checked})} /> 🚨 24/7 Emergency</label>
                  <label><input type="checkbox" checked={filters.openNow} onChange={(e) => setFilters({...filters, openNow: e.target.checked})} /> 🕐 Open Now</label>
                  <select value={filters.minRating} onChange={(e) => setFilters({...filters, minRating: Number(e.target.value)})}>
                    <option value={0}>Any Rating</option>
                    <option value={4}>4+ Stars</option>
                    <option value={4.5}>4.5+ Stars</option>
                  </select>
                </div>
              )}
            </div>
            <div className="providers-section">
              <h2>Nearby Services <span className="result-count">{filteredProviders.length} found</span></h2>
              {loading ? (
                <div className="loading">Loading services...</div>
              ) : filteredProviders.length > 0 ? (
                <div className="providers-grid">
                  {filteredProviders.map(provider => (
                    <div key={provider.id} className="provider-card">
                      <div className="provider-header">
                        <div className="provider-type-icon">{provider.typeIcon}</div>
                        <button className="save-btn" onClick={() => toggleSave(provider)}>
                          {savedProviders.find(p => p.id === provider.id) ? '❤️' : '🤍'}
                        </button>
                      </div>
                      <h3>{provider.name}</h3>
                      <p className="provider-type">{provider.type}</p>
                      <div className="provider-rating">⭐ {provider.rating} ({provider.reviews} reviews)</div>
                      <p className="provider-address">📍 {provider.address}</p>
                      <p className="provider-phone">📞 {provider.phone}</p>
                      <p className="provider-hours">🕐 {provider.hours}</p>
                      <div className="provider-meta">
                        <span className="trust-badge">Trust: {provider.communityTrust}%</span>
                        <span><strong>{provider.distance} km</strong> away</span>
                        <span>{provider.priceRange}</span>
                        {provider.emergency && <span className="emergency-badge">🚨 Emergency</span>}
                      </div>
                      <div className="provider-services">
                        {provider.services.slice(0, 3).map((s, i) => <span key={i} className="service-tag">{s}</span>)}
                      </div>
                      <div className="provider-actions">
                        <button className="route-btn" onClick={() => { setSelectedService(provider); setCurrentPage('route'); }}>🗺️ Get Directions</button>
                        <button className="contact-btn" onClick={() => window.location.href = `tel:${provider.phone}`}>📞 Call Now</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-providers">
                  <p>No services found within {radius} km. Try increasing the search radius.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'route':
        return (
          <div>
            <button className="back-btn" onClick={() => setCurrentPage('home')}>← Back to Services</button>
            {selectedService && (
              <div className="selected-service-card">
                <h2>{selectedService.name}</h2>
                <p>📍 {selectedService.address}</p>
                <p>📞 {selectedService.phone}</p>
                <p>⭐ {selectedService.rating} | Trust: {selectedService.communityTrust}%</p>
              </div>
            )}
            <RouteMap service={selectedService} userLocation={userLocation} />
          </div>
        );
      case 'saved':
        return (
          <div className="saved-page">
            <h1>❤️ Saved Services</h1>
            {!isAuthenticated ? (
              <div className="empty-state">
                <p>Please login to view saved services</p>
                <button onClick={() => openAuthModal('login')}>Sign In</button>
              </div>
            ) : savedProviders.length > 0 ? (
              <div className="providers-grid">
                {savedProviders.map(provider => (
                  <div key={provider.id} className="provider-card">
                    <h3>{provider.name}</h3>
                    <p>{provider.address}</p>
                    <p>📞 {provider.phone}</p>
                    <button className="route-btn" onClick={() => { setSelectedService(provider); setCurrentPage('route'); }}>Get Directions</button>
                    <button className="contact-btn" onClick={() => toggleSave(provider)}>Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No saved services yet</p>
                <button onClick={() => setCurrentPage('home')}>Browse Services</button>
              </div>
            )}
          </div>
        );
      case 'profile':
        return (
          <div className="profile-page">
            <h1>👤 My Profile</h1>
            {isAuthenticated ? (
              <div className="profile-card">
                <div className="profile-avatar"><img src={user?.avatar} alt={user?.name} /></div>
                <h2>{user?.name}</h2>
                <p>📧 {user?.email}</p>
                <p>📞 {user?.phone}</p>
                <div className="profile-stats">
                  <div className="stat">
                    <span className="stat-value">{savedProviders.length}</span>
                    <span>Saved</span>
                  </div>
                </div>
                <button className="location-button" onClick={updateLocation}>📍 Update Location</button>
                <button className="logout-btn" onClick={logout}>🚪 Sign Out</button>
              </div>
            ) : (
              <div className="profile-card">
                <div className="profile-avatar">👤</div>
                <h2>Guest User</h2>
                <p>Sign in to access your profile</p>
                <button className="auth-button" onClick={() => openAuthModal('login')}>Sign In</button>
              </div>
            )}
          </div>
        );
      case 'about':
        return (
          <div className="about-page">
            <h1>About CivicReach Locator</h1>
            <p>Your one-stop platform for finding essential services in Narasapuram, Andhra Pradesh</p>
            <h2>Services Available</h2>
            <div className="features-grid">
              <div className="feature-card"><span className="feature-icon">🏥</span><h3>Hospitals</h3><p>Find nearby hospitals and emergency care</p></div>
              <div className="feature-card"><span className="feature-icon">👮</span><h3>Police Stations</h3><p>Locate police stations for assistance</p></div>
              <div className="feature-card"><span className="feature-icon">📮</span><h3>Post Offices</h3><p>Postal services at your fingertips</p></div>
              <div className="feature-card"><span className="feature-icon">⚡</span><h3>Electricians</h3><p>Professional electrical services</p></div>
              <div className="feature-card"><span className="feature-icon">👔</span><h3>Tailors</h3><p>Expert tailoring services</p></div>
              <div className="feature-card"><span className="feature-icon">🗺️</span><h3>Voice Navigation</h3><p>Turn-by-turn voice guidance</p></div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setCurrentPage('home')}>📍 CivicReach</div>
        <div className="nav-links">
          <button className={currentPage === 'home' ? 'active' : ''} onClick={() => setCurrentPage('home')}>🏠 Home</button>
          <button className={currentPage === 'saved' ? 'active' : ''} onClick={() => setCurrentPage('saved')}>❤️ Saved ({savedProviders.length})</button>
          <button className={currentPage === 'profile' ? 'active' : ''} onClick={() => setCurrentPage('profile')}>{isAuthenticated ? `👤 ${user?.name?.split(' ')[0]}` : '👤 Profile'}</button>
          <button className={currentPage === 'about' ? 'active' : ''} onClick={() => setCurrentPage('about')}>ℹ️ About</button>
          {!isAuthenticated ? (
            <>
              <button className="login-nav-btn" onClick={() => openAuthModal('login')}>Sign In</button>
              <button className="register-nav-btn" onClick={() => openAuthModal('register')}>Register</button>
            </>
          ) : (
            <button className="logout-nav-btn" onClick={logout}>Sign Out</button>
          )}
        </div>
      </nav>
      <main className="main-content">{renderPage()}</main>
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div onClick={e => e.stopPropagation()}>
            {authMode === 'login' ? 
              <Login onSwitchToRegister={() => setAuthMode('register')} onClose={() => setShowAuthModal(false)} /> : 
              <Register onSwitchToLogin={() => setAuthMode('login')} onClose={() => setShowAuthModal(false)} />
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default App;