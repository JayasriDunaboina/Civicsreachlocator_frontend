// src/components/LocationSearch.jsx
import React, { useState } from 'react';

const LocationSearch = ({ onSearch, onSelectLocation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock geocoding - replace with actual API like OpenStreetMap Nominatim
  const searchLocation = async (query) => {
    if (!query) return;
    
    setLoading(true);
    // Using OpenStreetMap Nominatim API
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data.map(item => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      })));
    } catch (error) {
      console.error('Error searching location:', error);
      // Mock data for demo
      setSearchResults([
        { name: 'New Delhi, India', lat: 28.6139, lng: 77.2090 },
        { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777 },
        { name: 'Bangalore, India', lat: 12.9716, lng: 77.5946 },
        { name: 'Chennai, India', lat: 13.0827, lng: 80.2707 },
        { name: 'Kolkata, India', lat: 22.5726, lng: 88.3639 }
      ]);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchLocation(searchTerm);
  };

  const handleSelect = (location) => {
    onSelectLocation(location);
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <div className="location-search">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for a location (e.g., New Delhi, India)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn">
          🔍 Search
        </button>
      </form>

      {loading && <div className="loading">Searching...</div>}

      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>Select a location:</h4>
          <ul>
            {searchResults.map((result, idx) => (
              <li key={idx} onClick={() => handleSelect(result)}>
                <strong>{result.name}</strong>
                <small>
                  ({result.lat.toFixed(4)}, {result.lng.toFixed(4)})
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LocationSearch;