import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  Navigation, 
  Route, 
  Clock, 
  MapPin, 
  Fuel, 
  TrendingUp,
  Zap,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  ArrowRight,
  Truck,
  Target,
  Calculator,
  Save,
  Play,
  Pause,
  RotateCcw,
  Package
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Enhanced custom icon creation function
const createRouteIcon = (color, icon, size = 'normal') => {
  const iconSize = size === 'large' ? [35, 35] : [30, 30];
  const iconAnchor = size === 'large' ? [17, 17] : [15, 15];
  const iconInnerSize = size === 'large' ? '35px' : '30px';
  const fontSize = size === 'large' ? '18px' : '16px';
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: ${iconInnerSize}; height: ${iconInnerSize}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: ${fontSize};">${icon}</div>`,
    className: 'custom-route-icon',
    iconSize: iconSize,
    iconAnchor: iconAnchor
  });
};

// Custom icon creation for SVG-based icons
const createCustomIcon = (color, svgPath, size = 'normal') => {
  const iconSize = size === 'large' ? [40, 40] : [36, 36];
  const iconAnchor = size === 'large' ? [20, 20] : [18, 18];
  const svgSize = size === 'large' ? '24' : '20';
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; border-radius: 50%; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 3px solid white;">
      <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        ${svgPath}
      </svg>
    </div>`,
    className: 'custom-route-icon',
    iconSize: iconSize,
    iconAnchor: iconAnchor
  });
};

// Predefined icons
const pickupIcon = createRouteIcon('#10B981', '🌾');
const dropoffIcon = createRouteIcon('#3B82F6', '🏭');
const startIcon = createCustomIcon('#10B981', '<circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path><path d="m9 9 3 3 3-3"></path>');
const stopIcon = createCustomIcon('#3B82F6', '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16,8 20,8 23,11 23,16 16,16"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>');
const endIcon = createCustomIcon('#EF4444', '<path d="M21 16V8a2 2 0 0 0-1-1.73L12 2 4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L12 22l8-4.27A2 2 0 0 0 21 16z"></path><polyline points="3.29,7 12,12 20.71,7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line>');

// Live location icon with animation
const liveLocationIcon = L.divIcon({
  html: `<div style="background-color: #10B981; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px; animation: pulse 2s infinite;">🚛</div>`,
  className: 'live-location-icon',
  iconSize: [35, 35],
  iconAnchor: [17, 17]
});

// Distance calculation function
const calculateDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in kilometers
  const lat1 = point1.lat || point1.latitude;
  const lng1 = point1.lng || point1.longitude;
  const lat2 = point2.lat || point2.latitude;
  const lng2 = point2.lng || point2.longitude;
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Route optimization algorithm (Nearest Neighbor)
const optimizeRoute = (deliveries, startLocation) => {
  if (deliveries.length <= 1) return deliveries;

  const unvisited = [...deliveries];
  const optimized = [];
  let currentLocation = startLocation;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    unvisited.forEach((delivery, index) => {
      const coords = delivery.dropoffCoordinates || delivery.delivery?.coordinates;
      if (!coords) return;
      
      const distance = calculateDistance(currentLocation, {
        lat: coords.latitude,
        lng: coords.longitude
      });
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    const nearestDelivery = unvisited.splice(nearestIndex, 1)[0];
    optimized.push(nearestDelivery);
    const coords = nearestDelivery.dropoffCoordinates || nearestDelivery.delivery?.coordinates;
    currentLocation = {
      lat: coords.latitude,
      lng: coords.longitude
    };
  }

  return optimized;
};

const UnifiedRouteMap = ({ 
  // Interactive map props
  routeData = null,
  delivery = null,
  liveLocation = null,
  // Route optimization props
  deliveries = [], 
  currentLocation = null,
  // Map configuration
  className = "",
  height = "400px",
  showOptimization = false,
  showInteractive = false,
  // Callbacks
  onRouteCalculated = null
}) => {
  // Route optimization state
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routeStats, setRouteStats] = useState({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [routePreferences, setRoutePreferences] = useState({
    optimizeFor: 'distance',
    avoidTolls: false,
    avoidHighways: false,
    vehicleType: 'truck'
  });

  // Default location
  const defaultLocation = currentLocation || { lat: 27.7172, lng: 85.3240 }; // Kathmandu, Nepal

  // Process route data for interactive mode
  const pickupCoords = routeData?.pickup?.coordinates;
  const dropoffCoords = routeData?.delivery?.coordinates;

  // Filter valid deliveries for optimization
  const validDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const coords = d.pickupCoordinates || d.dropoffCoordinates || d.delivery?.coordinates;
      return coords?.latitude && 
             coords?.longitude && 
             d.status !== 'delivered';
    });
  }, [deliveries]);

  // Calculate route statistics
  const calculateRouteStats = (route, start) => {
    if (route.length === 0) return { totalDistance: 0, estimatedTime: 0, fuelCost: 0 };

    let totalDistance = 0;
    let prevLocation = start;

    route.forEach(delivery => {
      const coords = delivery.dropoffCoordinates || delivery.delivery?.coordinates;
      if (!coords) return;
      
      const distance = calculateDistance(prevLocation, {
        lat: coords.latitude,
        lng: coords.longitude
      });
      totalDistance += distance;
      prevLocation = {
        lat: coords.latitude,
        lng: coords.longitude
      };
    });

    const estimatedTime = totalDistance * 2; // Rough estimate: 30 km/h average with stops
    const fuelCost = (totalDistance / 12) * 110; // 12 km/l, ₹110/l

    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      estimatedTime: Math.round(estimatedTime),
      fuelCost: Math.round(fuelCost),
      deliveries: route.length
    };
  };

  // Optimize route
  const handleOptimizeRoute = async () => {
    setIsOptimizing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const optimized = optimizeRoute(validDeliveries, defaultLocation);
      setOptimizedRoute(optimized);
      
      const stats = calculateRouteStats(optimized, defaultLocation);
      setRouteStats(stats);
      
      if (onRouteCalculated) {
        onRouteCalculated(optimized, stats);
      }
    } catch (error) {
      console.error('Route optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Navigation controls
  const handleStartNavigation = () => {
    setNavigationMode(true);
    setCurrentStep(0);
  };

  const handleStopNavigation = () => {
    setNavigationMode(false);
    setCurrentStep(0);
  };

  const handleNextStep = () => {
    if (currentStep < optimizedRoute.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleStopNavigation();
    }
  };

  // Auto-optimize on deliveries change
  useEffect(() => {
    if (showOptimization && validDeliveries.length > 0) {
      handleOptimizeRoute();
    }
  }, [validDeliveries, showOptimization]);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (showInteractive && pickupCoords && dropoffCoords) {
      return [
        (pickupCoords.latitude + dropoffCoords.latitude) / 2,
        (pickupCoords.longitude + dropoffCoords.longitude) / 2
      ];
    }
    
    if (showOptimization && optimizedRoute.length > 0) {
      const lats = optimizedRoute.map(d => {
        const coords = d.dropoffCoordinates || d.delivery?.coordinates;
        return coords?.latitude;
      }).filter(Boolean);
      const lngs = optimizedRoute.map(d => {
        const coords = d.dropoffCoordinates || d.delivery?.coordinates;
        return coords?.longitude;
      }).filter(Boolean);
      
      lats.push(defaultLocation.lat);
      lngs.push(defaultLocation.lng);
      
      if (lats.length > 0 && lngs.length > 0) {
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        return [avgLat, avgLng];
      }
    }
    
    return [defaultLocation.lat, defaultLocation.lng];
  }, [showInteractive, showOptimization, pickupCoords, dropoffCoords, optimizedRoute, defaultLocation]);

  // Route coordinates for polyline
  const routeCoordinates = useMemo(() => {
    if (showInteractive && pickupCoords && dropoffCoords) {
      return [
        [pickupCoords.latitude, pickupCoords.longitude],
        [dropoffCoords.latitude, dropoffCoords.longitude]
      ];
    }
    
    if (showOptimization && optimizedRoute.length > 0) {
      const coords = [[defaultLocation.lat, defaultLocation.lng]];
      optimizedRoute.forEach(delivery => {
        const deliveryCoords = delivery.dropoffCoordinates || delivery.delivery?.coordinates;
        if (deliveryCoords) {
          coords.push([deliveryCoords.latitude, deliveryCoords.longitude]);
        }
      });
      return coords;
    }
    
    return [];
  }, [showInteractive, showOptimization, pickupCoords, dropoffCoords, optimizedRoute, defaultLocation]);

  return (
    <div className={`bg-white rounded-xl shadow-lg border overflow-hidden ${className}`}>
      {/* Header */}
      {showOptimization && (
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Route Optimization</h3>
                <p className="text-sm text-gray-600">
                  {navigationMode ? `Step ${currentStep + 1} of ${optimizedRoute.length}` : `${validDeliveries.length} deliveries to optimize`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!navigationMode ? (
                <>
                  <button
                    onClick={handleOptimizeRoute}
                    disabled={isOptimizing || validDeliveries.length === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isOptimizing
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    } flex items-center space-x-2`}
                  >
                    {isOptimizing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Optimizing...</span>
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4" />
                        <span>Optimize</span>
                      </>
                    )}
                  </button>
                  
                  {optimizedRoute.length > 0 && (
                    <button
                      onClick={handleStartNavigation}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>Start Navigation</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleNextStep}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center space-x-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>Next Stop</span>
                  </button>
                  <button
                    onClick={handleStopNavigation}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center space-x-2"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Stop</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Route Statistics */}
      {showOptimization && routeStats.totalDistance && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{routeStats.totalDistance} km</div>
              <div className="text-sm text-gray-600">Total Distance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{routeStats.estimatedTime} min</div>
              <div className="text-sm text-gray-600">Estimated Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">₹{routeStats.fuelCost}</div>
              <div className="text-sm text-gray-600">Fuel Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{routeStats.deliveries}</div>
              <div className="text-sm text-gray-600">Stops</div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive map info for single route */}
      {showInteractive && routeData && (
        <div className="p-4 border-b bg-gray-50">
          <h4 className="font-medium text-gray-800 flex items-center">
            🗺️ Interactive Route Map
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              P:{pickupCoords ? '✅' : '❌'} D:{dropoffCoords ? '✅' : '❌'}
            </span>
          </h4>
          <div className="mt-2 text-xs text-gray-600">
            {pickupCoords && (
              <p><strong>Pickup:</strong> {routeData.pickup?.location}({pickupCoords.latitude}, {pickupCoords.longitude})</p>
            )}
            {dropoffCoords && (
              <p><strong>Delivery:</strong> {routeData.delivery?.location}({dropoffCoords.latitude}, {dropoffCoords.longitude})</p>
            )}
          </div>
        </div>
      )}

      {/* Map Container */}
      <div style={{ height }} className="relative">
        {(showInteractive && pickupCoords && dropoffCoords) || (showOptimization && validDeliveries.length > 0) ? (
          <MapContainer
            center={mapCenter}
            zoom={12}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Interactive Map Markers */}
            {showInteractive && pickupCoords && (
              <Marker 
                position={[pickupCoords.latitude, pickupCoords.longitude]}
                icon={pickupIcon}
              >
                <Popup maxWidth={300}>
                  <div className="p-3">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        🌾
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-800">Pickup Location</h4>
                        <p className="text-sm text-gray-600">{routeData.pickup?.location}</p>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Farmer:</strong> {routeData.pickup?.contact?.name || delivery?.farmerId?.name || 'Unknown'}</p>
                      {routeData.pickup?.contact?.email && (
                        <p><strong>Email:</strong> {routeData.pickup.contact.email}</p>
                      )}
                      <p><strong>Coordinates:</strong> {pickupCoords.latitude?.toFixed(6)}, {pickupCoords.longitude?.toFixed(6)}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {showInteractive && dropoffCoords && (
              <Marker 
                position={[dropoffCoords.latitude, dropoffCoords.longitude]}
                icon={dropoffIcon}
              >
                <Popup maxWidth={300}>
                  <div className="p-3">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        🏭
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800">Dropoff Location</h4>
                        <p className="text-sm text-gray-600">{routeData.delivery?.warehouse?.name || routeData.delivery?.location || 'Warehouse'}</p>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Warehouse:</strong> {routeData.delivery?.warehouse?.name || routeData.delivery?.location || 'Main Warehouse'}</p>
                      <p><strong>Coordinates:</strong> {dropoffCoords.latitude?.toFixed(6)}, {dropoffCoords.longitude?.toFixed(6)}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Live Location Marker */}
            {showInteractive && liveLocation && (
              <Marker 
                position={[liveLocation.latitude, liveLocation.longitude]}
                icon={liveLocationIcon}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-semibold text-green-800">Live Location</h4>
                    <p className="text-sm text-gray-600">Current transporter position</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated: {liveLocation.timestamp ? new Date(liveLocation.timestamp).toLocaleTimeString() : 'Recently'}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route Optimization Markers */}
            {showOptimization && (
              <>
                {/* Starting location */}
                <Marker position={[defaultLocation.lat, defaultLocation.lng]} icon={startIcon}>
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <Truck className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Starting Point</h4>
                          <p className="text-sm text-gray-600">Your Current Location</p>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Delivery stops */}
                {optimizedRoute.map((delivery, index) => {
                  const coords = delivery.dropoffCoordinates || delivery.delivery?.coordinates;
                  if (!coords) return null;
                  
                  return (
                    <Marker
                      key={delivery._id}
                      position={[coords.latitude, coords.longitude]}
                      icon={index === currentStep && navigationMode ? 
                        createCustomIcon('#F59E0B', '<circle cx="12" cy="12" r="3"></circle><path d="m9 9 3 3 3-3"></path>') : 
                        stopIcon
                      }
                    >
                      <Popup maxWidth={300}>
                        <div className="p-3">
                          <div className="flex items-start space-x-3 mb-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: index === currentStep && navigationMode ? '#F59E0B' : '#3B82F6' }}
                            >
                              <span className="text-white font-bold">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{delivery.goodsDescription}</h4>
                              <p className="text-sm text-gray-600">{delivery.quantity} units</p>
                              <div className={`mt-2 px-2 py-1 text-xs rounded-full inline-flex items-center ${
                                delivery.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                                delivery.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {delivery.status}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-700">{delivery.dropoffLocation}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Target className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-700">Priority: {delivery.urgency || 'Normal'}</span>
                            </div>
                          </div>

                          {navigationMode && index === currentStep && (
                            <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                              <div className="flex items-center space-x-2 text-yellow-800">
                                <Navigation className="h-4 w-4" />
                                <span className="text-sm font-medium">Current Destination</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </>
            )}

            {/* Route Line */}
            {routeCoordinates.length > 1 && (
              <>
                {showInteractive && (
                  <>
                    <Polyline
                      positions={routeCoordinates}
                      color="#3B82F6"
                      weight={4}
                      opacity={0.7}
                      dashArray="5, 10"
                    />
                    <Polyline
                      positions={routeCoordinates}
                      color="#F59E0B"
                      weight={5}
                      opacity={0.8}
                    />
                  </>
                )}
                {showOptimization && (
                  <Polyline
                    positions={routeCoordinates}
                    color="#3B82F6"
                    weight={4}
                    opacity={0.7}
                    dashArray={navigationMode ? "10, 10" : ""}
                  />
                )}
              </>
            )}
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-gray-500 mb-2">
                {showInteractive ? 'Route coordinates not available' : 'No deliveries available for route optimization'}
              </p>
              <p className="text-sm text-gray-400">
                {showInteractive ? 'Contact admin to set pickup and dropoff coordinates' : 'Add deliveries with location data to start planning routes'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Instructions */}
      {showOptimization && navigationMode && optimizedRoute.length > 0 && (
        <div className="p-4 bg-blue-50 border-t">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900">
                Navigate to: {optimizedRoute[currentStep]?.dropoffLocation}
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Delivery: {optimizedRoute[currentStep]?.goodsDescription} ({optimizedRoute[currentStep]?.quantity} units)
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600">
                Stop {currentStep + 1} of {optimizedRoute.length}
              </div>
              <div className="text-xs text-blue-500 mt-1">
                {Math.round(calculateDistance(
                  currentStep === 0 ? defaultLocation : {
                    lat: (optimizedRoute[currentStep - 1].dropoffCoordinates || optimizedRoute[currentStep - 1].delivery?.coordinates)?.latitude,
                    lng: (optimizedRoute[currentStep - 1].dropoffCoordinates || optimizedRoute[currentStep - 1].delivery?.coordinates)?.longitude
                  },
                  {
                    lat: (optimizedRoute[currentStep].dropoffCoordinates || optimizedRoute[currentStep].delivery?.coordinates)?.latitude,
                    lng: (optimizedRoute[currentStep].dropoffCoordinates || optimizedRoute[currentStep].delivery?.coordinates)?.longitude
                  }
                ) * 10) / 10} km away
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Route Preferences */}
      {showOptimization && (
        <div className="p-4 border-t bg-gray-50">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Route Preferences</span>
              </div>
              <div className="group-open:rotate-180 transition-transform">
                <ArrowRight className="h-4 w-4 text-gray-500" />
              </div>
            </summary>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Optimize For</label>
                <select
                  value={routePreferences.optimizeFor}
                  onChange={(e) => setRoutePreferences({...routePreferences, optimizeFor: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="distance">Shortest Distance</option>
                  <option value="time">Fastest Time</option>
                  <option value="fuel">Fuel Efficiency</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
                <select
                  value={routePreferences.vehicleType}
                  onChange={(e) => setRoutePreferences({...routePreferences, vehicleType: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={routePreferences.avoidTolls}
                  onChange={(e) => setRoutePreferences({...routePreferences, avoidTolls: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Avoid Tolls</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={routePreferences.avoidHighways}
                  onChange={(e) => setRoutePreferences({...routePreferences, avoidHighways: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Avoid Highways</span>
              </label>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default UnifiedRouteMap;
