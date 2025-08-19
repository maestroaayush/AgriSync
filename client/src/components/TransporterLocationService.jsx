import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Play,
  Pause,
  Settings,
  Eye,
  EyeOff

} from 'lucide-react';

const TransporterLocationService = ({ 
  onLocationUpdate, 
  isVisible = true,
  className = "",
  autoStart = false,
  isActive = false 
}) => {
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Settings - sync shareLocation with parent isActive state
  const [settings, setSettings] = useState({
    highAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
    updateInterval: 15000, // 15 seconds
    shareLocation: isActive
  });

  // Sync shareLocation setting with parent isActive prop
  useEffect(() => {
    setSettings(prev => ({ ...prev, shareLocation: isActive }));
  }, [isActive]);

  // Auto-start tracking when isActive becomes true
  useEffect(() => {
    if (isActive && !isTracking && locationPermission === 'granted') {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }
  }, [isActive, isTracking, locationPermission]);

  // Check for existing location permission on component mount
  useEffect(() => {
    const checkLocationPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          setLocationPermission(result.state);
          
          if (result.state === 'granted') {
            // Try to get cached location
            const cachedLocation = localStorage.getItem('transporterLocation');
            if (cachedLocation) {
              const location = JSON.parse(cachedLocation);
              setCurrentLocation(location);
              if (onLocationUpdate) onLocationUpdate(location);
            }
            
            if (autoStart || isActive) {
              startTracking();
            }
          }
        } catch (error) {
          console.error('Error checking location permission:', error);
        }
      }
    };
    
    checkLocationPermission();
  }, [autoStart, onLocationUpdate, isActive]);

  // Request location permission
  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return false;
    }

    try {
      setLocationPermission('requesting');
      setError(null);

      // Request permission by attempting to get location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: settings.highAccuracy,
            timeout: settings.timeout,
            maximumAge: settings.maximumAge
          }
        );
      });

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
        speed: position.coords.speed,
        heading: position.coords.heading
      };

      setCurrentLocation(locationData);
      setLocationPermission('granted');
      
      // Store location
      localStorage.setItem('transporterLocation', JSON.stringify(locationData));
      
      if (onLocationUpdate) {
        onLocationUpdate(locationData);
      }

      return true;
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationPermission('denied');
      
      let errorMessage = 'Unable to get location. ';
      if (error.code === error.PERMISSION_DENIED) {
        errorMessage += 'Location access was denied.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMessage += 'Location information is unavailable.';
      } else if (error.code === error.TIMEOUT) {
        errorMessage += 'Location request timed out.';
      } else {
        errorMessage += 'An unknown error occurred.';
      }
      
      setError(errorMessage);
      return false;
    }
  };

  // Start live location tracking
  const startTracking = async () => {
    if (locationPermission !== 'granted') {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }

    if (isTracking) return;

    setIsTracking(true);
    setTrackingStartTime(new Date());
    setError(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          speed: position.coords.speed,
          heading: position.coords.heading
        };

        setCurrentLocation(locationData);
        
        // Add to location history
        setLocationHistory(prev => {
          const updated = [...prev, locationData];
          // Keep only last 100 locations
          return updated.slice(-100);
        });

        // Store latest location
        localStorage.setItem('transporterLocation', JSON.stringify(locationData));
        
        if (settings.shareLocation && onLocationUpdate) {
          onLocationUpdate(locationData);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        let errorMessage = 'Location tracking failed: ';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage += 'Permission denied';
          setLocationPermission('denied');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage += 'Position unavailable';
        } else if (error.code === error.TIMEOUT) {
          errorMessage += 'Request timeout';
        }
        setError(errorMessage);
        stopTracking();
      },
      {
        enableHighAccuracy: settings.highAccuracy,
        timeout: settings.timeout,
        maximumAge: settings.maximumAge
      }
    );

    setWatchId(id);
  };

  // Stop location tracking
  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    setTrackingStartTime(null);
  };

  // Toggle location sharing (only if not controlled by parent)
  const toggleLocationSharing = () => {
    if (isActive !== undefined) return; // Don't allow toggle if controlled by parent
    setSettings(prev => ({ ...prev, shareLocation: !prev.shareLocation }));
  };

  // Format duration
  const formatDuration = (startTime) => {
    if (!startTime) return '00:00:00';
    const diff = Math.floor((new Date() - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Live duration counter
  const [duration, setDuration] = useState('00:00:00');
  useEffect(() => {
    let interval;
    if (isTracking && trackingStartTime) {
      interval = setInterval(() => {
        setDuration(formatDuration(trackingStartTime));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, trackingStartTime]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Navigation2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Live Location Tracking</h3>
            <p className="text-sm text-gray-600">
              {isTracking ? `Active • ${duration}` : 'Inactive'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            {isMinimized ? <Eye className="h-4 w-4 text-gray-600" /> : <EyeOff className="h-4 w-4 text-gray-600" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Status Section */}
            <div className="p-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Location Permission Status */}
              {locationPermission === 'prompt' && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-6 w-6 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-2">Enable Location Tracking</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Allow location access to enable live tracking for deliveries and route optimization.
                      </p>
                      <button
                        onClick={requestLocationPermission}
                        disabled={locationPermission === 'requesting'}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        {locationPermission === 'requesting' ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Requesting...</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4" />
                            <span>Allow Location Access</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Location Display */}
              {currentLocation && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 mb-2">Current Location</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                        <div>Lat: {currentLocation.latitude.toFixed(6)}</div>
                        <div>Lng: {currentLocation.longitude.toFixed(6)}</div>
                        <div>Accuracy: {currentLocation.accuracy?.toFixed(0)}m</div>
                        <div>Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}</div>
                      </div>
                      {currentLocation.speed && (
                        <div className="text-sm text-green-700 mt-1">
                          Speed: {(currentLocation.speed * 3.6).toFixed(1)} km/h
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Controls */}
              {locationPermission === 'granted' && (
                <div className="space-y-4">
                  {/* Tracking Controls */}
                  <div className="flex space-x-3">
                    <button
                      onClick={isTracking ? stopTracking : startTracking}
                      disabled={isActive !== undefined} // Disable if controlled by parent
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isTracking
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      } ${isActive !== undefined ? 'opacity-75 cursor-not-allowed' : ''}`}
                      title={isActive !== undefined ? 'Location tracking is controlled by delivery status' : ''}
                    >
                      {isTracking ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span>Stop Tracking</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span>Start Tracking</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={toggleLocationSharing}
                      disabled={isActive !== undefined} // Disable if controlled by parent
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        settings.shareLocation
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      } ${isActive !== undefined ? 'opacity-75 cursor-not-allowed' : ''}`}
                      title={isActive !== undefined ? 'Location sharing is controlled by delivery status' : 'Toggle location sharing'}
                    >
                      {settings.shareLocation ? 'Sharing On' : 'Sharing Off'}
                    </button>
                  </div>

                  {/* Statistics */}
                  {isTracking && (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900">{locationHistory.length}</div>
                        <div className="text-xs text-gray-600">Updates</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900">{duration}</div>
                        <div className="text-xs text-gray-600">Duration</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-bold text-gray-900">
                          {currentLocation?.accuracy ? `${currentLocation.accuracy.toFixed(0)}m` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Accuracy</div>
                      </div>
                    </div>
                  )}

                  {/* Location Sharing Status */}
                  <div className="text-center">
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
                      isTracking && settings.shareLocation
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isTracking && settings.shareLocation ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span>
                        {isTracking && settings.shareLocation
                          ? 'Live location visible to customers'
                          : isActive !== undefined && !isActive
                          ? 'Start transit to enable location sharing'
                          : 'Location sharing disabled'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Permission Denied State */}
              {locationPermission === 'denied' && (
                <div className="text-center p-6">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">Location Access Denied</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    To enable location tracking, please allow location access in your browser settings.
                  </p>
                  <button
                    onClick={() => {
                      setLocationPermission('prompt');
                      setError(null);
                    }}
                    className="text-blue-600 text-sm font-medium hover:text-blue-800"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TransporterLocationService;
