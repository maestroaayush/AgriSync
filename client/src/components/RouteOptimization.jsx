import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
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
  RotateCcw
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different stop types
const createCustomIcon = (color, iconComponent) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; border-radius: 50%; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 3px solid white;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        ${iconComponent}
      </svg>
    </div>`,
    className: 'custom-route-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

const startIcon = createCustomIcon('#10B981', '<circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path><path d="m9 9 3 3 3-3"></path>');
const stopIcon = createCustomIcon('#3B82F6', '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16,8 20,8 23,11 23,16 16,16"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>');
const endIcon = createCustomIcon('#EF4444', '<path d="M21 16V8a2 2 0 0 0-1-1.73L12 2 4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L12 22l8-4.27A2 2 0 0 0 21 16z"></path><polyline points="3.29,7 12,12 20.71,7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line>');

// Route optimization algorithms
const calculateDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Nearest neighbor heuristic for TSP
const optimizeRoute = (deliveries, startLocation) => {
  if (deliveries.length <= 1) return deliveries;

  const unvisited = [...deliveries];
  const optimized = [];
  let currentLocation = startLocation;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    unvisited.forEach((delivery, index) => {
      const distance = calculateDistance(currentLocation, {
        lat: delivery.dropoffCoordinates.latitude,
        lng: delivery.dropoffCoordinates.longitude
      });
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    const nearestDelivery = unvisited.splice(nearestIndex, 1)[0];
    optimized.push(nearestDelivery);
    currentLocation = {
      lat: nearestDelivery.dropoffCoordinates.latitude,
      lng: nearestDelivery.dropoffCoordinates.longitude
    };
  }

  return optimized;
};

const RouteOptimization = ({ deliveries = [], currentLocation, className = "" }) => {
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routeStats, setRouteStats] = useState({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [navigationMode, setNavigationMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [routePreferences, setRoutePreferences] = useState({
    optimizeFor: 'distance', // 'distance', 'time', 'fuel'
    avoidTolls: false,
    avoidHighways: false,
    vehicleType: 'truck'
  });

  // Default location (Mumbai)
  const defaultLocation = currentLocation || { lat: 19.0760, lng: 72.8777 };

  // Filter deliveries that have coordinates and are not delivered
  const validDeliveries = useMemo(() => {
    return deliveries.filter(d => 
      d.pickupCoordinates?.latitude && 
      d.pickupCoordinates?.longitude && 
      d.dropoffCoordinates?.latitude && 
      d.dropoffCoordinates?.longitude && 
      d.status !== 'delivered'
    );
  }, [deliveries]);

  // Calculate route statistics
  const calculateRouteStats = (route, start) => {
    if (route.length === 0) return { totalDistance: 0, estimatedTime: 0, fuelCost: 0 };

    let totalDistance = 0;
    let prevLocation = start;

    route.forEach(delivery => {
      const distance = calculateDistance(prevLocation, {
        lat: delivery.dropoffCoordinates.latitude,
        lng: delivery.dropoffCoordinates.longitude
      });
      totalDistance += distance;
      prevLocation = {
        lat: delivery.dropoffCoordinates.latitude,
        lng: delivery.dropoffCoordinates.longitude
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
      // Simulate API call for route optimization
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const optimized = optimizeRoute(validDeliveries, defaultLocation);
      setOptimizedRoute(optimized);
      
      const stats = calculateRouteStats(optimized, defaultLocation);
      setRouteStats(stats);
    } catch (error) {
      console.error('Route optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Start navigation
  const handleStartNavigation = () => {
    setNavigationMode(true);
    setCurrentStep(0);
  };

  // Stop navigation
  const handleStopNavigation = () => {
    setNavigationMode(false);
    setCurrentStep(0);
  };

  // Next step in navigation
  const handleNextStep = () => {
    if (currentStep < optimizedRoute.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleStopNavigation();
    }
  };

  // Auto-optimize on deliveries change
  useEffect(() => {
    if (validDeliveries.length > 0) {
      handleOptimizeRoute();
    }
  }, [validDeliveries]);

  // Map center calculation
  const mapCenter = useMemo(() => {
    if (optimizedRoute.length === 0) return [defaultLocation.lat, defaultLocation.lng];
    
    const lats = optimizedRoute.map(d => d.dropoffCoordinates.latitude);
    const lngs = optimizedRoute.map(d => d.dropoffCoordinates.longitude);
    lats.push(defaultLocation.lat);
    lngs.push(defaultLocation.lng);
    
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    
    return [avgLat, avgLng];
  }, [optimizedRoute, defaultLocation]);

  // Route polyline coordinates
  const routeCoordinates = useMemo(() => {
    if (optimizedRoute.length === 0) return [];
    
    const coords = [[defaultLocation.lat, defaultLocation.lng]];
    optimizedRoute.forEach(delivery => {
      coords.push([delivery.dropoffCoordinates.latitude, delivery.dropoffCoordinates.longitude]);
    });
    
    return coords;
  }, [optimizedRoute, defaultLocation]);

  return (
    <div className={`bg-white rounded-xl shadow-lg border overflow-hidden ${className}`}>
      {/* Header */}
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

      {/* Route Statistics */}
      {routeStats.totalDistance && (
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

      {/* Map */}
      <div className="h-96 relative">
        {validDeliveries.length > 0 ? (
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
            {optimizedRoute.map((delivery, index) => (
              <Marker
                key={delivery._id}
                position={[delivery.dropoffCoordinates.latitude, delivery.dropoffCoordinates.longitude]}
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
            ))}

            {/* Route line */}
            {routeCoordinates.length > 1 && (
              <Polyline
                positions={routeCoordinates}
                color="#3B82F6"
                weight={4}
                opacity={0.7}
                dashArray={navigationMode ? "10, 10" : ""}
              />
            )}
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No deliveries available for route optimization</p>
              <p className="text-sm text-gray-400 mt-2">Add deliveries with location data to start planning routes</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Instructions */}
      {navigationMode && optimizedRoute.length > 0 && (
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
                    lat: optimizedRoute[currentStep - 1].dropoffCoordinates.latitude,
                    lng: optimizedRoute[currentStep - 1].dropoffCoordinates.longitude
                  },
                  {
                    lat: optimizedRoute[currentStep].dropoffCoordinates.latitude,
                    lng: optimizedRoute[currentStep].dropoffCoordinates.longitude
                  }
                ) * 10) / 10} km away
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Route Preferences */}
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
    </div>
  );
};

export default RouteOptimization;
