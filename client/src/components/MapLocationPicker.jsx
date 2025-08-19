import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Search, MapPin, Navigation2, CheckCircle, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker component that handles map clicks
const LocationMarker = ({ position, setPosition, onLocationSelect }) => {
  const map = useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      if (onLocationSelect) {
        onLocationSelect({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        });
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}>
    </Marker>
  );
};

const MapLocationPicker = ({
  initialPosition = [28.3949, 84.1240], // Default to Nepal center
  onLocationSelect,
  isOpen,
  onClose,
  title = "Select Location on Map"
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const mapRef = useRef();

  // Get current user location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPosition = [position.coords.latitude, position.coords.longitude];
        setPosition(newPosition);
        setSelectedLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        
        // Center map on new position
        if (mapRef.current) {
          mapRef.current.setView(newPosition, 15);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your current location. Please click on the map to set a location.');
      }
    );
  };

  // Search for a location using Nominatim API
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newPosition = [parseFloat(result.lat), parseFloat(result.lon)];
        setPosition(newPosition);
        setAddress(result.display_name);
        setSelectedLocation({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          address: result.display_name
        });

        // Center map on search result
        if (mapRef.current) {
          mapRef.current.setView(newPosition, 15);
        }
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching for location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Reverse geocoding to get address from coordinates
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        setAddress(data.display_name);
        setSelectedLocation(prev => ({
          ...prev,
          address: data.display_name
        }));
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Handle location selection from map click
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    getAddressFromCoords(location.latitude, location.longitude);
  };

  // Confirm location selection
  const confirmLocation = () => {
    if (selectedLocation && onLocationSelect) {
      onLocationSelect({
        ...selectedLocation,
        address: address
      });
    }
    if (onClose) onClose();
  };

  // Handle keyboard events
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchLocation();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600 mt-1">Click on the map to set a location or search for an address</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Search and Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for an address or place..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <button
                onClick={searchLocation}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-5 w-5" />
                )}
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </div>

            {/* Get Current Location Button */}
            <button
              onClick={getCurrentLocation}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Navigation2 className="h-5 w-5" />
              <span>Use Current Location</span>
            </button>
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Selected Location</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex space-x-4">
                      <span>Lat: {selectedLocation.latitude.toFixed(6)}</span>
                      <span>Lng: {selectedLocation.longitude.toFixed(6)}</span>
                    </div>
                    {address && (
                      <p className="text-gray-700">{address}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="h-96">
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker
              position={position}
              setPosition={setPosition}
              onLocationSelect={handleLocationSelect}
            />
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Click anywhere on the map to select a location
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmLocation}
              disabled={!selectedLocation}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapLocationPicker;
