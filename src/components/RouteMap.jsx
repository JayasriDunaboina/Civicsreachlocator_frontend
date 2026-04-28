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

  // Speech function
  const speak = (text) => {
    if (!voiceEnabled) return;
    
    try {
      window.speechSynthesis.cancel();
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
  const generateDetailedSteps = (startLat, startLng, endLat, endLng, totalDist) => {
    const bearing = calculateBearing(startLat, startLng, endLat, endLng);
    const direction = getCardinalDirection(bearing);
    const steps = [];
    
    // Step 1: Start
    steps.push({
      id: 0,
      instruction: `Start your journey heading ${direction.name}. You will travel approximately ${totalDist.toFixed(1)} kilometers to reach ${service.name}.`,
      shortInstruction: `Head ${direction.name}`,
      direction: direction.name,
      directionIcon: direction.icon,
      distance: totalDist.toFixed(2),
      cumulativeDistance: totalDist.toFixed(2),
      type: 'start'
    });
    
    // Step 2: Midpoint announcement (if distance > 1km)
    if (totalDist > 1) {
      steps.push({
        id: 1,
        instruction: `Continue heading ${direction.name} for another ${(totalDist/2).toFixed(1)} kilometers. You are halfway to ${service.name}.`,
        shortInstruction: `Continue ${direction.name}`,
        direction: direction.name,
        directionIcon: direction.icon,
        distance: (totalDist/2).toFixed(2),
        cumulativeDistance: totalDist.toFixed(2),
        type: 'midpoint'
      });
    }
    
    // Step 3: Almost there
    if (totalDist > 0.5) {
      steps.push({
        id: steps.length,
        instruction: `You are almost there. ${service.name} is ${(totalDist*0.2).toFixed(1)} kilometers ahead on the ${direction.name === 'North' ? 'right' : direction.name === 'South' ? 'left' : 'side'}.`,
        shortInstruction: `Almost there!`,
        direction: direction.name,
        directionIcon: direction.icon,
        distance: (totalDist*0.2).toFixed(2),
        cumulativeDistance: totalDist.toFixed(2),
        type: 'almost'
      });
    }
    
    // Step 4: Arrival
    steps.push({
      id: steps.length,
      instruction: `You have arrived at your destination. ${service.name} at ${service.address} is on your ${direction.name === 'North' ? 'right' : direction.name === 'South' ? 'left' : 'side'}. Thank you for using Public Service Access System.`,
      shortInstruction: `Arrived at ${service.name}`,
      direction: direction.name,
      directionIcon: '🏁',
      distance: "0",
      cumulativeDistance: totalDist.toFixed(2),
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
        
        // Generate detailed steps
        const steps = generateDetailedSteps(startLat, startLng, endLat, endLng, routeDistance);
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
      
      const steps = generateDetailedSteps(startLat, startLng, endLat, endLng, dist);
      setNavigationSteps(steps);
      setCurrentDirection(steps[0].direction);
    } finally {
      setLoading(false);
    }
  };

  // Voice Navigation Functions
  const startVoiceNavigation = () => {
    if (!navigationSteps.length) return;
    setIsNavigating(true);
    setCurrentStep(0);
    speak(navigationSteps[0].instruction);
  };
  
  const nextStep = () => {
    if (currentStep + 1 < navigationSteps.length) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      speak(navigationSteps[nextIndex].instruction);
    } else {
      speak("You have reached your destination. Thank you for using Public Service Access System.");
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
    speak(`You are heading ${direction.name}. Your destination ${service.name} is ${distance} kilometers away.`);
  };
  
  const stopVoiceNavigation = () => {
    window.speechSynthesis.cancel();
    setIsNavigating(false);
    setCurrentStep(0);
    setIsSpeaking(false);
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
      {/* Voice Navigation Panel - This replaces the old Navigation Information */}
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
            
            {/* Current Navigation Status */}
            {isNavigating && navigationSteps[currentStep] && (
              <div className="current-status">
                <div className="direction-badge">{mainDirection.icon} {mainDirection.name}</div>
                <div className="step-info">Step {currentStep + 1} of {navigationSteps.length}</div>
                <div className="current-instruction">{navigationSteps[currentStep].shortInstruction}</div>
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
              <div className="stat-label-large">Total Distance</div>
            </div>
          </div>
          <div className="stat-card-full">
            <div className="stat-icon-large">⏱️</div>
            <div className="stat-info">
              <div className="stat-value-large">{travelTime || '--'}</div>
              <div className="stat-label-large">Est. Travel Time</div>
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