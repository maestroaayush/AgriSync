import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import socketService from "../../services/socketService";
import axios from "axios";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area
} from "recharts";

// Import Leaflet components for map
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Import custom CSS animations for live location tracking
import "../../styles/transporter-animations.css";

// Fix for default markers in React Leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Custom icons for route markers
const createRouteIcon = (color, icon) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 16px;">${icon}</div>`,
    className: 'custom-route-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const pickupIcon = createRouteIcon('#10B981', '🌾');
const dropoffIcon = createRouteIcon('#3B82F6', '🏭');
const currentLocationIcon = createRouteIcon('#F59E0B', '🚛');
const liveLocationIcon = L.divIcon({
  html: `<div style="background-color: #10B981; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px; animation: pulse 2s infinite;">🚛</div>`,
  className: 'live-location-icon',
  iconSize: [35, 35],
  iconAnchor: [17, 17]
});

// Route Modal Component with Interactive Map
const RouteModal = ({ isOpen, onClose, routeData, delivery }) => {
  if (!isOpen || !routeData || !delivery) return null;

  // Extract coordinates from the backend response structure
  const pickupCoords = routeData.pickup?.coordinates;
  const dropoffCoords = routeData.delivery?.coordinates;
  
  // Calculate map center and route coordinates
  const mapCenter = pickupCoords && dropoffCoords
    ? [
        (pickupCoords.latitude + dropoffCoords.latitude) / 2,
        (pickupCoords.longitude + dropoffCoords.longitude) / 2
      ]
    : [27.705545, 85.333525]; // Default center

  const routeCoordinates = [];
  if (pickupCoords && pickupCoords.latitude && pickupCoords.longitude) {
    routeCoordinates.push([pickupCoords.latitude, pickupCoords.longitude]);
  }
  if (dropoffCoords && dropoffCoords.latitude && dropoffCoords.longitude) {
    routeCoordinates.push([dropoffCoords.latitude, dropoffCoords.longitude]);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            🗺️ Delivery Route - {delivery.farmerId?.name || delivery.farmer?.name || routeData.pickup?.contact?.name || 'Unknown Farmer'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="flex h-[calc(95vh-120px)]">
          {/* Left Panel - Route Details */}
          <div className="w-1/3 p-6 overflow-y-auto border-r">
            {/* Route Summary */}
            <div className="mb-6 space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">
                  📍 Pickup Location
                </h4>
                <p className="text-sm text-gray-700">{routeData.pickup?.location || delivery.pickupLocation}</p>
                {pickupCoords && (
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {pickupCoords.latitude?.toFixed(4)}, {pickupCoords.longitude?.toFixed(4)}
                  </p>
                )}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">
                  🏭 Warehouse Location
                </h4>
                <p className="text-sm text-gray-700">{routeData.delivery?.warehouse?.name || routeData.delivery?.location || delivery.dropoffLocation || 'Main Warehouse'}</p>
                {dropoffCoords && (
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {dropoffCoords.latitude?.toFixed(4)}, {dropoffCoords.longitude?.toFixed(4)}
                  </p>
                )}
              </div>
            </div>

            {/* Delivery Details */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">Delivery Information</h4>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Items</p>
                  <p className="font-medium">{delivery.items?.length || 0} item(s)</p>
                </div>
                <div>
                  <p className="text-gray-500">Priority</p>
                  <p className="font-medium capitalize">{delivery.urgency || 'Normal'}</p>
                </div>
                {delivery.scheduledPickupTime && (
                  <div>
                    <p className="text-gray-500">Scheduled Pickup</p>
                    <p className="font-medium text-xs">{new Date(delivery.scheduledPickupTime).toLocaleString()}</p>
                  </div>
                )}
                {delivery.scheduledDeliveryTime && (
                  <div>
                    <p className="text-gray-500">Expected Delivery</p>
                    <p className="font-medium text-xs">{new Date(delivery.scheduledDeliveryTime).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            {delivery.items && delivery.items.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3">Items to Pickup</h4>
                <div className="space-y-2">
                  {delivery.items.map((item, index) => (
                    <div key={index} className="bg-white p-3 rounded border flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.crop}</p>
                        <p className="text-sm text-gray-600">{item.quantity} {item.unit}</p>
                      </div>
                      📦
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Route Instructions */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">📋 Instructions</h4>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>Navigate to the pickup location shown above</li>
                <li>Contact the farmer: {routeData.pickup?.contact?.email || delivery.farmerId?.phone || 'N/A'}</li>
                <li>Verify and collect all items listed above</li>
                <li>Mark items as "Picked Up" in the dashboard</li>
                <li>Navigate to the warehouse for delivery</li>
                <li>Complete delivery and update status</li>
              </ol>
            </div>
          </div>
          
          {/* Right Panel - Interactive Map */}
          <div className="flex-1 relative">
            {pickupCoords && dropoffCoords && pickupCoords.latitude && dropoffCoords.latitude ? (
              <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Pickup Location Marker */}
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
                          <p className="text-sm text-gray-600">{routeData.pickup?.location || delivery.pickupLocation}</p>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Farmer:</strong> {routeData.pickup?.contact?.name || delivery.farmerId?.name || delivery.farmer?.name || 'Unknown'}</p>
                        {routeData.pickup?.contact?.email && (
                          <p><strong>Email:</strong> {routeData.pickup.contact.email}</p>
                        )}
                        <p><strong>Coordinates:</strong> {pickupCoords.latitude?.toFixed(6)}, {pickupCoords.longitude?.toFixed(6)}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Dropoff Location Marker */}
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
                          <p className="text-sm text-gray-600">{routeData.delivery?.warehouse?.name || routeData.delivery?.location || delivery.dropoffLocation || 'Warehouse'}</p>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Warehouse:</strong> {routeData.delivery?.warehouse?.name || routeData.delivery?.location || 'Main Warehouse'}</p>
                        <p><strong>Coordinates:</strong> {dropoffCoords.latitude?.toFixed(6)}, {dropoffCoords.longitude?.toFixed(6)}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Route Line */}
                {routeCoordinates.length > 1 && (
                  <Polyline
                    positions={routeCoordinates}
                    color="#3B82F6"
                    weight={4}
                    opacity={0.7}
                    dashArray="10, 10"
                  />
                )}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center">
                  <div className="text-6xl mb-4">🗺️</div>
                  <p className="text-gray-500 mb-2">Route coordinates not available</p>
                  <p className="text-sm text-gray-400">Contact admin to set pickup and dropoff coordinates</p>
                  {/* Debug info */}
                  <div className="mt-4 text-xs text-gray-400 bg-gray-50 p-3 rounded">
                    <p>Debug Info:</p>
                    <p>Pickup coords: {pickupCoords ? JSON.stringify(pickupCoords) : 'null'}</p>
                    <p>Dropoff coords: {dropoffCoords ? JSON.stringify(dropoffCoords) : 'null'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Calendar,
  Navigation,
  Route,
  Fuel,
  DollarSign,
  Activity,
  Eye,
  Edit3,
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  Bell,
  User,
  ChevronDown,
  Star,
  Settings,
  RefreshCw,
  Phone,
  Mail,
  Zap,
  Target,
  Globe,
  Layers,
  Database,
  PieChart as PieChartIcon,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Lazy imports for map components to prevent SSR issues
import TransporterLocationService from "../../components/TransporterLocationService";
import RouteOptimization from "../../components/RouteOptimization";

// Real-time GPS Tester Component
const GPSTester = () => {
  const [currentGPS, setCurrentGPS] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isWatching, setIsWatching] = useState(false);
  const [watchId, setWatchId] = useState(null);

  const startGPSWatch = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, timestamp } = position.coords;
        setCurrentGPS({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(timestamp).toLocaleTimeString(),
          source: 'Real GPS Watch'
        });
        setGpsError(null);
        console.log('🔴 REAL GPS UPDATE:', latitude, longitude, 'accuracy:', accuracy);
      },
      (error) => {
        console.error('GPS Watch Error:', error);
        setGpsError(`GPS Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    setWatchId(id);
    setIsWatching(true);
  };

  const stopGPSWatch = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsWatching(false);
  };

  const getOneTimeGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, timestamp } = position.coords;
        setCurrentGPS({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(timestamp).toLocaleTimeString(),
          source: 'One-time GPS'
        });
        setGpsError(null);
        console.log('🟢 ONE-TIME GPS:', latitude, longitude, 'accuracy:', accuracy);
      },
      (error) => {
        console.error('One-time GPS Error:', error);
        setGpsError(`GPS Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!isWatching ? (
          <button
            onClick={startGPSWatch}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
          >
            📍 Start GPS Watch
          </button>
        ) : (
          <button
            onClick={stopGPSWatch}
            className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
          >
            🛑 Stop GPS Watch
          </button>
        )}
        <button
          onClick={getOneTimeGPS}
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
        >
          📍 Get GPS Once
        </button>
      </div>

      {currentGPS && (
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <h5 className="font-medium text-green-800 mb-2">🔴 REAL GPS Location</h5>
          <div className="text-sm space-y-1">
            <p><strong>Source:</strong> {currentGPS.source}</p>
            <p><strong>Coordinates:</strong> {currentGPS.latitude.toFixed(6)}, {currentGPS.longitude.toFixed(6)}</p>
            <p><strong>Accuracy:</strong> {currentGPS.accuracy ? `${Math.round(currentGPS.accuracy)}m` : 'unknown'}</p>
            <p><strong>Updated:</strong> {currentGPS.timestamp}</p>
          </div>
        </div>
      )}

      {gpsError && (
        <div className="bg-red-50 p-3 rounded border border-red-200">
          <p className="text-red-700 text-sm">{gpsError}</p>
        </div>
      )}

      {isWatching && (
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <p className="text-blue-700 text-sm flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></span>
            GPS watching active - location updates automatically
          </p>
        </div>
      )}
    </div>
  );
};

function TransporterDashboard() {
  // Core data states
  const [deliveries, setDeliveries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [transportMetrics, setTransportMetrics] = useState(null);
  const [fuelData, setFuelData] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  
  // Location tracking states
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [useMockLocation, setUseMockLocation] = useState(false);
  
  // Modal states
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeDelivery, setRouteDelivery] = useState(null);
  const [selectedDeliveryRoute, setSelectedDeliveryRoute] = useState(null);
  const [pickupLoading, setPickupLoading] = useState(null);
  const [notificationRetryCount, setNotificationRetryCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  // Live location tracking states
  const [liveLocation, setLiveLocation] = useState(null);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [liveLocationError, setLiveLocationError] = useState(null);
  
  // Route navigation states
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  
  // OpenRouteService API key - using a valid public key for testing
  const ORS_API_KEY = '5b3ce3597851110001cf6248a9c1b43c1bdc433b8e634b7da4a3e99d';
  
  // Function to get navigation route from current location to destination
  const getNavigationRoute = async (fromCoords, toCoords) => {
    if (!fromCoords || !toCoords) {
      setRouteError('Invalid coordinates for route calculation');
      return null;
    }

    setRouteLoading(true);
    setRouteError(null);

    try {
      console.log('🧭 Calculating route from:', fromCoords, 'to:', toCoords);
      console.log('🔑 Using API key:', ORS_API_KEY.substring(0, 20) + '...');
      
      const requestBody = {
        coordinates: [
          [fromCoords.longitude, fromCoords.latitude],  // Start point [lng, lat]
          [toCoords.longitude, toCoords.latitude]       // End point [lng, lat]
        ],
        format: 'geojson',
        profile: 'driving-car',
        instructions: true,
        geometry: true
      };
      
      console.log('📡 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📊 Response status:', response.status, response.statusText);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🗺️ Raw route data received:');
      console.log('- Type:', data.type);
      console.log('- Features count:', data.features?.length);
      console.log('- First feature:', data.features?.[0]);
      console.log('- Full data:', JSON.stringify(data, null, 2));

      if (data.features && data.features[0]) {
        const route = data.features[0];
        const summary = route.properties.summary;
        const segments = route.properties.segments;
        
        console.log('📏 Route summary:', summary);
        console.log('🚗 Route segments:', segments?.length || 0);
        console.log('📍 Geometry type:', route.geometry?.type);
        console.log('📍 Coordinates count:', route.geometry?.coordinates?.length || 0);
        console.log('📍 First few coordinates:', route.geometry?.coordinates?.slice(0, 5));
        
        const routeInfo = {
          coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert [lng,lat] to [lat,lng]
          distance: summary.distance, // meters
          duration: summary.duration, // seconds
          instructions: segments?.[0]?.steps || [],
          bbox: data.bbox,
          fallback: false
        };
        
        console.log('✅ Route processed successfully:', {
          distance: `${(routeInfo.distance / 1000).toFixed(1)} km`,
          duration: `${Math.round(routeInfo.duration / 60)} minutes`,
          points: routeInfo.coordinates.length,
          fallback: routeInfo.fallback
        });
        
        setNavigationRoute(routeInfo);
        return routeInfo;
      } else {
        throw new Error('No route found in response - features array is empty');
      }
    } catch (error) {
      console.error('❌ Route calculation failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      setRouteError(`Route calculation failed: ${error.message}`);
      
      // Try alternative routing service or fallback to straight line
      console.log('🔄 Trying alternative: OSRM routing service...');
      try {
        const osrmResponse = await fetch(`http://router.project-osrm.org/route/v1/driving/${fromCoords.longitude},${fromCoords.latitude};${toCoords.longitude},${toCoords.latitude}?overview=full&geometries=geojson`);
        
        if (osrmResponse.ok) {
          const osrmData = await osrmResponse.json();
          console.log('🗺️ OSRM route data:', osrmData);
          
          if (osrmData.routes && osrmData.routes[0]) {
            const osrmRoute = osrmData.routes[0];
            const routeInfo = {
              coordinates: osrmRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert [lng,lat] to [lat,lng]
              distance: osrmRoute.distance, // meters
              duration: osrmRoute.duration, // seconds
              instructions: [],
              fallback: false,
              source: 'OSRM'
            };
            
            console.log('✅ OSRM route processed:', {
              distance: `${(routeInfo.distance / 1000).toFixed(1)} km`,
              duration: `${Math.round(routeInfo.duration / 60)} minutes`,
              points: routeInfo.coordinates.length,
              source: routeInfo.source
            });
            
            setNavigationRoute(routeInfo);
            return routeInfo;
          }
        }
      } catch (osrmError) {
        console.error('❌ OSRM fallback also failed:', osrmError);
      }
      
      // Final fallback to simple straight line
      console.log('📐 Using final fallback: straight-line route');
      const fallbackRoute = {
        coordinates: [
          [fromCoords.latitude, fromCoords.longitude],
          [toCoords.latitude, toCoords.longitude]
        ],
        distance: calculateDistance(fromCoords, toCoords) * 1000, // Convert to meters
        duration: null,
        instructions: [{
          instruction: `Navigate directly to destination (${calculateDistance(fromCoords, toCoords).toFixed(1)} km)`,
          distance: calculateDistance(fromCoords, toCoords) * 1000,
          type: 0
        }],
        fallback: true,
        source: 'Straight Line'
      };
      
      setNavigationRoute(fallbackRoute);
      return fallbackRoute;
    } finally {
      setRouteLoading(false);
    }
  };
  
  // Helper function to calculate straight-line distance between two points
  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Profile form states
  const [profileForm, setProfileForm] = useState({
    location: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  // Form states
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [selectedRole, setSelectedRole] = useState("transporter");

// Use AuthContext instead of direct localStorage access
const { user } = useAuth();
const token = localStorage.getItem("token");

console.log('TransporterDashboard rendered with user:', user);

// Socket state
const [socket, setSocket] = useState(null);

// Component initialization
useEffect(() => {
  // Ensure components are marked as loaded
  setComponentsLoaded(true);
}, []);

// Mock location for testing (Kathmandu, Nepal coordinates)
const MOCK_LOCATION = {
  latitude: 27.7172,
  longitude: 85.3240,
  accuracy: 10,
  speed: 0,
  heading: 0
};

// Location sharing functionality
const startLocationSharing = async (deliveryId) => {
  console.log('🚀 Starting location sharing for delivery:', deliveryId);
  
  // Reset retry count when starting fresh
  setRetryCount(0);
  setIsRetrying(false);
  
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    setLocationError("Geolocation is not supported by this browser. Location sharing cannot be enabled.");
    return;
  }

  // Check permission status first
  if ('permissions' in navigator) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('📍 Current geolocation permission:', permission.state);
      
      if (permission.state === 'denied') {
        setLocationError("Location access is denied. Please enable location permissions in your browser settings and refresh the page.");
        return;
      }
    } catch (permError) {
      console.log('⚠️ Could not check permission status:', permError);
    }
  }

  // Progressive fallback strategy for location access with improved timeouts
  const tryLocationAccess = async () => {
    console.log('🔄 Trying high accuracy location access...');
    
    // If mock location is enabled, use it immediately
    if (useMockLocation) {
      console.log('🎭 Using mock location for testing');
      return {
        coords: MOCK_LOCATION,
        timestamp: Date.now()
      };
    }
    
    // First try high accuracy with extended timeout
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000, // Extended timeout for high accuracy
            maximumAge: 30000 // 30 seconds cache
          }
        );
      });
      
      console.log('✅ High accuracy location access confirmed');
      return position;
    } catch (highAccuracyError) {
      console.log('⚠️ High accuracy failed, trying standard accuracy...', highAccuracyError);
      
      // If high accuracy fails due to timeout, try standard accuracy
      if (highAccuracyError.code === 3) { // TIMEOUT
        console.log('🔄 Trying network-based location...');
        
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: false, // Use network location
                timeout: 30000, // Much longer timeout for network location
                maximumAge: 120000 // 2 minute cache
              }
            );
          });
          
          console.log('✅ Standard accuracy location access confirmed');
          return position;
        } catch (standardError) {
          console.error('❌ Both high and standard accuracy failed:', standardError);
          throw standardError;
        }
      } else {
        throw highAccuracyError;
      }
    }
  };

  // Test location access with fallback strategy
  try {
    const position = await tryLocationAccess();
    console.log('✅ Location access confirmed, starting sharing...');
    setActiveDeliveryId(deliveryId);
    setIsLocationSharing(true);
    setLocationError(null);
    
    // Start immediate location update
    setTimeout(() => updateLocation(), 1000);
  } catch (error) {
    console.error('❌ Location access test failed:', error);
    
    const currentRetry = retryCount + 1;
    setRetryCount(currentRetry);
    
    let errorMessage = "Cannot start location sharing. ";
    let shouldRetry = false;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage += "Location access was denied. Please:\n1. Click the location icon in your browser's address bar\n2. Allow location access for this site\n3. Refresh the page and try again";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage += "Location is unavailable. Please:\n1. Ensure GPS is enabled on your device\n2. Try moving to an area with better signal\n3. Check if location services are enabled in browser settings";
        shouldRetry = currentRetry < 3;
        break;
      case error.TIMEOUT:
        errorMessage += `Location request timed out (attempt ${currentRetry}/3). This often happens:\n1. Indoors or in areas with poor GPS signal\n2. When GPS is initializing\n3. On some devices with strict power saving\n\nTip: Try moving outdoors or near a window.`;
        shouldRetry = currentRetry < 3;
        break;
      default:
        errorMessage += "Unknown location error. Please check your device settings and try again.";
        shouldRetry = currentRetry < 2;
        break;
    }
    
    if (shouldRetry) {
      errorMessage += `\n\nRetrying automatically in ${Math.pow(2, currentRetry) * 5} seconds... (${currentRetry}/3)`;
      setIsRetrying(true);
      
      // Exponential backoff retry
      setTimeout(() => {
        console.log(`🔄 Retrying location access (attempt ${currentRetry + 1})`);
        startLocationSharing(deliveryId);
      }, Math.pow(2, currentRetry) * 5000); // 5s, 10s, 20s delays
    } else {
      errorMessage += "\n\n💡 Alternative: You can enable mock location mode for testing purposes.";
      setIsRetrying(false);
    }
    
    setLocationError(errorMessage);
  }
};

const stopLocationSharing = () => {
  setActiveDeliveryId(null);
  setIsLocationSharing(false);
};

const updateLocation = async () => {
  if (!activeDeliveryId || !isLocationSharing) return;
  
  if (!navigator.geolocation && !useMockLocation) {
    setLocationError("Geolocation is not supported by this browser.");
    return;
  }

  // First check permission status if available
  if ('permissions' in navigator) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('📍 Geolocation permission status:', permission.state);
      
      if (permission.state === 'denied') {
        setLocationError("Location access denied. Please enable location access in browser settings and refresh the page.");
        return;
      }
    } catch (permError) {
      console.log('⚠️ Could not check permission status:', permError);
    }
  }

  // Progressive fallback strategy with better timeout handling
  const getLocationWithFallback = async () => {
    console.log('🔄 Getting location for update...');
    console.log('🔍 useMockLocation state:', useMockLocation);
    console.log('🔍 navigator.geolocation available:', !!navigator.geolocation);
    
    // Use mock location if enabled
    if (useMockLocation) {
      console.log('🎭 Using mock location for update (useMockLocation = true)');
      // Simulate slight movement for testing
      const jitter = (Math.random() - 0.5) * 0.001; // Small random movement
      return {
        coords: {
          ...MOCK_LOCATION,
          latitude: MOCK_LOCATION.latitude + jitter,
          longitude: MOCK_LOCATION.longitude + jitter
        },
        timestamp: Date.now()
      };
    }
    
    // Try cached location first (very fast)
    try {
      const cachedPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 8000, // Extended timeout for cached data
            maximumAge: 120000 // Accept 2-minute old data for updates
          }
        );
      });
      
      console.log('✅ Cached location obtained for update');
      return cachedPosition;
    } catch (cachedError) {
      console.log('⚠️ Cached location failed, trying fresh location...', cachedError);
      
      // If cached fails, try fresh location with reasonable timeout
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000, // Extended timeout to avoid frequent failures
              maximumAge: 60000 // 1 minute cache
            }
          );
        });
        
        console.log('✅ Fresh high accuracy location obtained for update');
        return position;
      } catch (freshError) {
        console.log('⚠️ Fresh high accuracy failed, trying network location...', freshError);
        
        // Final fallback to network-based location
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: false, // Network-based location
                timeout: 25000, // Much longer timeout for network location
                maximumAge: 300000 // Accept 5-minute old data as last resort
              }
            );
          });
          
          console.log('✅ Network-based location obtained for update');
          return position;
        } catch (networkError) {
          console.error('❌ All location methods failed for update:', networkError);
          throw networkError;
        }
      }
    }
  };

  try {
    const position = await getLocationWithFallback();
    const { latitude, longitude, speed, heading, accuracy } = position.coords;
    console.log("📍 Sending location update", latitude, longitude, `accuracy: ${accuracy}m`);
    
    // Clear any previous errors on successful location fetch
    setLocationError(null);
    
    try {
      const response = await axios.put(
        `http://localhost:5000/api/deliveries/${activeDeliveryId}/location`,
        { 
          latitude, 
          longitude, 
          speed: speed || 0, 
          heading: heading || 0, 
          accuracy: accuracy || 0,
          timestamp: new Date().toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("✅ Location update successful:", response.data);
      
      // Update local live location state immediately for real-time display
      setLiveLocation({
        latitude,
        longitude,
        accuracy: accuracy || 0,
        timestamp: new Date().toISOString()
      });
      
    } catch (serverError) {
      console.error("❌ Failed to update location on server", serverError);
      // Don't show server errors as persistent UI errors since location sharing continues
      console.log('⚠️ Server update failed - will retry on next cycle');
    }
  } catch (error) {
    console.error("❌ Error getting location for update", error);
    
    // Handle different error types with appropriate user feedback
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        console.log('🛑 Location permission denied - stopping location sharing');
        setLocationError("Location access was denied. Location sharing has been stopped.");
        // Automatically stop location sharing on permission denied
        setIsLocationSharing(false);
        setActiveDeliveryId(null);
        break;
      case 2: // POSITION_UNAVAILABLE
        console.log('⚠️ Location unavailable - continuing to retry');
        // Don't show persistent error for position unavailable during updates
        break;
      case 3: // TIMEOUT
        console.log('⚠️ Location timeout - this is normal, continuing to retry');
        // Don't show persistent error for timeouts during automatic updates
        // Location sharing will continue and retry on the next cycle
        break;
      default:
        console.log('❌ Unknown location error:', error);
        // Only show unknown errors briefly
        break;
    }
    
    // Don't set persistent errors for common issues during automatic updates
    // This prevents UI spam when GPS is temporarily unavailable
  }
};

// Initialize Socket.IO connection using service
useEffect(() => {
  console.log('Socket.IO useEffect triggered with user:', user);
  
  if (user && user.id && user.role === "transporter") {
    console.log('Initializing Socket.IO connection via service for user:', user.id);
    
    socketService.connect(user.id)
      .then((socket) => {
        console.log('Socket.IO service connected successfully for user:', user.id);
        setSocket(socket);
      })
      .catch((error) => {
        console.error('Socket.IO service connection failed:', error);
      });

    // Cleanup on unmount or user change
    return () => {
      console.log('Cleaning up Socket.IO connection via service for user:', user?.id);
      if (user?.id) {
        socketService.disconnect(user.id);
      }
      setSocket(null);
    };
  } else {
    console.log('No valid user or not a transporter, skipping Socket.IO connection');
  }
}, [user?.id, user?.role]); // Only depend on user.id and role

// Location update effect
useEffect(() => {
  if (socket && isLocationSharing && activeDeliveryId) {
    // Send location update every 30 seconds
    const locationInterval = setInterval(updateLocation, 30000);
    // Send initial location update
    updateLocation();

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }
}, [socket, isLocationSharing, activeDeliveryId]);

// Live location tracking for the current transporter
const fetchLiveLocation = async () => {
  if (!user?.id || activeTab !== 'routes') {
    console.log('⏸️ Skipping live location fetch - user:', user?.id, 'activeTab:', activeTab);
    return;
  }
  
  try {
    console.log('🔄 Fetching live location for transporter:', user.id);
    console.log('🔗 Calling endpoint: /api/deliveries/active-locations');
    
    // Use the deliveries/active-locations endpoint which transporters have access to
    const response = await axios.get('http://localhost:5000/api/deliveries/active-locations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📡 Active deliveries API response:');
    console.log('- Status:', response.status);
    console.log('- Data count:', response.data?.length || 0);
    console.log('- Full response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.length > 0) {
      console.log('📊 Processing', response.data.length, 'active deliveries:');
      
      // Log each delivery's location status
      response.data.forEach((delivery, index) => {
        console.log(`📦 Delivery ${index + 1}:`);
        console.log(`   - ID: ${delivery.id}`);
        console.log(`   - Status: ${delivery.status}`);
        console.log(`   - Has currentLocation: ${!!delivery.currentLocation}`);
        console.log(`   - Current Location:`, delivery.currentLocation);
        if (delivery.currentLocation) {
          console.log(`   - Lat: ${delivery.currentLocation.latitude}`);
          console.log(`   - Lng: ${delivery.currentLocation.longitude}`);
          console.log(`   - Timestamp: ${delivery.currentLocation.timestamp || delivery.currentLocation.lastUpdated}`);
        }
      });
      
      // Find the most recent delivery with a current location
      const deliveriesWithLocation = response.data.filter(delivery => 
        delivery.currentLocation && 
        delivery.currentLocation.latitude && 
        delivery.currentLocation.longitude
      );
      
      console.log('📍 Deliveries with valid location data:', deliveriesWithLocation.length);
      
      if (deliveriesWithLocation.length > 0) {
        // Get the most recently updated location
        const mostRecentDelivery = deliveriesWithLocation.reduce((latest, current) => {
          const latestTime = latest.currentLocation.lastUpdated || latest.currentLocation.timestamp || '1970-01-01';
          const currentTime = current.currentLocation.lastUpdated || current.currentLocation.timestamp || '1970-01-01';
          return new Date(currentTime) > new Date(latestTime) ? current : latest;
        });
        
        console.log('✅ Most recent live location found:');
        console.log('   - Delivery ID:', mostRecentDelivery.id);
        console.log('   - Location:', mostRecentDelivery.currentLocation);
        console.log('   - Coordinates:', `${mostRecentDelivery.currentLocation.latitude}, ${mostRecentDelivery.currentLocation.longitude}`);
        
        setLiveLocation(mostRecentDelivery.currentLocation);
        setLiveLocationError(null);
      } else {
        console.log('❌ No active deliveries with live location found');
        console.log('💡 This means either:');
        console.log('   - No deliveries are in "assigned" or "in_transit" status');
        console.log('   - OR location sharing is not active on any delivery');
        console.log('   - OR currentLocation data is missing/invalid');
        setLiveLocation(null);
        setLiveLocationError(null); // Don't show error if no active deliveries
      }
    } else {
      console.log('❌ No active deliveries returned from API');
      console.log('💡 This means no deliveries match the filter criteria for this transporter');
      setLiveLocation(null);
      setLiveLocationError(null); // Don't show error if no active deliveries
    }
  } catch (error) {
    console.error('❌ Failed to fetch live location:', error);
    console.error('📋 Error details:');
    console.error('   - Message:', error.message);
    console.error('   - Status:', error.response?.status);
    console.error('   - Response data:', error.response?.data);
    console.error('   - Request URL:', error.config?.url);
    setLiveLocationError(`Failed to fetch live location: ${error.response?.data?.message || error.message}`);
  }
};

// Live location tracking effect - polls every 10 seconds when routes tab is active or location sharing is active
useEffect(() => {
  if ((activeTab === 'routes' || isLocationSharing) && user?.id) {
    console.log('🔄 Starting live location tracking for routes tab or active location sharing');
    setIsTrackingLive(true);
    
    // Fetch initial location
    fetchLiveLocation();
    
    // Set up polling interval - more frequent for better real-time tracking
    const liveLocationInterval = setInterval(fetchLiveLocation, 10000); // Every 10 seconds
    
    return () => {
      console.log('🛑 Stopping live location tracking');
      clearInterval(liveLocationInterval);
      setIsTrackingLive(false);
    };
  } else {
    setIsTrackingLive(false);
    setLiveLocation(null);
  }
}, [activeTab, user?.id, isLocationSharing]);

  // Fetch delivery route information
  const fetchDeliveryRoute = async (deliveryId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/delivery/${deliveryId}/route`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setRouteData(response.data.route);
        setSelectedDeliveryRoute(deliveryId);
        setShowRouteModal(true);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      alert('Failed to load route information');
    }
  };

  // View route in routes tab
  const viewRouteInTab = async (deliveryId) => {
    try {
      console.log('🚛 Fetching route for delivery ID:', deliveryId);
      const response = await axios.get(`http://localhost:5000/api/delivery/${deliveryId}/route`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📡 Route API Response:', response.data);
      
      if (response.data.success) {
        console.log('✅ Route data received:', response.data.route);
        console.log('📍 Pickup coordinates:', response.data.route.pickup?.coordinates);
        console.log('🏢 Delivery coordinates:', response.data.route.delivery?.coordinates);
        console.log('🗺 Full route structure:', JSON.stringify(response.data.route, null, 2));
        
        setRouteData(response.data.route);
        const delivery = deliveries.find(d => d._id === deliveryId);
        console.log('📦 Found delivery for route:', delivery);
        setRouteDelivery(delivery);
        setSelectedDeliveryRoute(deliveryId);
        setActiveTab('routes'); // Switch to routes tab
        
        // Auto-calculate navigation route based on pickup status
        const route = response.data.route;
        const isPickedUp = route.pickedUp;
        const pickupCoords = route.pickup?.coordinates;
        const deliveryCoords = route.delivery?.coordinates;
        
        console.log('🗺️ Route calculation logic:');
        console.log('   - Picked up status:', isPickedUp);
        console.log('   - Current location available:', !!liveLocation);
        console.log('   - Pickup coords:', pickupCoords);
        console.log('   - Delivery coords:', deliveryCoords);
        
        if (liveLocation) {
          let targetCoords = null;
          let targetDescription = '';
          
          if (isPickedUp && deliveryCoords?.latitude && deliveryCoords?.longitude) {
            // Items already picked up - route to warehouse/delivery location
            targetCoords = deliveryCoords;
            targetDescription = `warehouse (${route.delivery?.location || 'destination'})`;
            console.log('🏭 Routing to warehouse after pickup');
          } else if (!isPickedUp && pickupCoords?.latitude && pickupCoords?.longitude) {
            // Items not yet picked up - route to pickup location
            targetCoords = pickupCoords;
            targetDescription = `pickup location (${route.pickup?.location || 'farm'})`;
            console.log('🌾 Routing to pickup location');
          }
          
          if (targetCoords) {
            console.log(`🧭 Auto-calculating navigation route from current location to ${targetDescription}`);
            console.log('   - From (current):', liveLocation.latitude, liveLocation.longitude);
            console.log('   - To (target):', targetCoords.latitude, targetCoords.longitude);
            
            await getNavigationRoute(
              { latitude: liveLocation.latitude, longitude: liveLocation.longitude },
              { latitude: targetCoords.latitude, longitude: targetCoords.longitude }
            );
          } else {
            console.log('⚠️ Cannot determine target coordinates:');
            console.log('   - isPickedUp:', isPickedUp);
            console.log('   - deliveryCoords valid:', !!(deliveryCoords?.latitude && deliveryCoords?.longitude));
            console.log('   - pickupCoords valid:', !!(pickupCoords?.latitude && pickupCoords?.longitude));
          }
        } else {
          console.log('⚠️ Cannot auto-calculate navigation route - no live location available');
        }
      } else {
        console.error('❌ Route API returned success: false');
        alert('Route data not available');
      }
    } catch (error) {
      console.error('💥 Error fetching route:', error);
      console.error('Error details:', error.response?.data);
      alert('Failed to load route information: ' + (error.response?.data?.message || error.message));
    }
  };

  // Mark items as picked up
  const markAsPickedUp = async (deliveryId) => {
    try {
      setPickupLoading(deliveryId);
      console.log('📦 Marking items as picked up for delivery:', deliveryId);
      
      const response = await axios.put(`http://localhost:5000/api/delivery/${deliveryId}/pickup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.message) {
        console.log('✅ Items marked as picked up successfully');
        
        // Automatically show route to warehouse after marking picked up
        console.log('🏭 Auto-switching to warehouse route...');
        await viewRouteInTab(deliveryId);
        
        alert(response.data.message + ' - Route updated to show warehouse destination.');
        fetchDeliveries(); // Refresh deliveries
        
        console.log('🔄 Pickup flow completed: route switched to warehouse');
      }
    } catch (error) {
      console.error('Error marking pickup:', error);
      alert(error.response?.data?.message || 'Failed to mark items as picked up');
    } finally {
      setPickupLoading(null);
    }
  };

  const navigate = useNavigate();
  const COLORS = ["#0EA5E9", "#F59E0B", "#10B981", "#F472B6", "#8B5CF6"];

  const formatDate = (date) => date?.toISOString().split("T")[0] || "";
  const buildUrl = (endpoint) => {
    const q = [];
    if (from) q.push(`from=${formatDate(from)}`);
    if (to) q.push(`to=${formatDate(to)}`);
    return `${endpoint}${q.length ? `?${q.join("&")}` : ""}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const fetchDeliveries = async () => {
    try {
      console.log('Fetching deliveries for user:', user.id);
      const res = await axios.get("http://localhost:5000/api/deliveries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('All deliveries response:', res.data);
      console.log('Total deliveries fetched:', res.data.length);
      
      const assigned = res.data.filter((d) => {
        console.log('Checking delivery:', d._id, 'transporter:', d.transporter, 'user.id:', user.id);
        return d.transporter === user.id || d.transporter?.toString() === user.id;
      });
      
      // Exclude completed/cancelled tasks from active list
      const activeAssigned = assigned.filter(d => d.status !== 'delivered' && d.status !== 'cancelled');
      
      console.log('Filtered deliveries for transporter (active only):', activeAssigned.length);
      console.log('Active assigned deliveries:', activeAssigned);
      
      // Log delivery statuses for debugging
      console.log('Delivery statuses (active only):');
      activeAssigned.forEach((delivery, index) => {
        console.log(`Delivery ${index + 1}: ID=${delivery._id}, Status="${delivery.status}", Type=${typeof delivery.status}`);
      });
      
      const statusCounts = {
        delivered: assigned.filter(d => d.status === 'delivered').length,
        in_transit: activeAssigned.filter(d => d.status === 'in_transit').length,
        assigned: activeAssigned.filter(d => d.status === 'assigned').length,
        other: activeAssigned.filter(d => !['delivered', 'in_transit', 'assigned'].includes(d.status)).length
      };
      console.log('Status counts:', statusCounts);
      
      setDeliveries(activeAssigned);
    } catch (err) {
      console.error("Failed to load deliveries", err);
    }
  };
  const updateStatus = async (id, newStatus) =e {
    try {
      await axios.put(
        `http://localhost:5000/api/deliveries/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optimistically update UI: remove completed/cancelled tasks from active list
      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        setDeliveries(prev =e prev.filter(d =e String(d._id) !== String(id)));
      } else {
        fetchDeliveries();
      }
    } catch (err) {
      console.error("Failed to update delivery status", err);
    }
  };
  };

  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);
      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
      // Reset retry count and rate limit status on successful fetch
      if (notificationRetryCount > 0) {
        setNotificationRetryCount(0);
      }
      if (isRateLimited) {
        setIsRateLimited(false);
      }
    } catch (err) {
      console.error("Notification fetch failed", err);
      if (err.response?.status === 429) {
        // Handle rate limiting with exponential backoff
        setNotificationRetryCount(prev => prev + 1);
        setIsRateLimited(true);
        console.log(`Rate limited. Retry attempt: ${notificationRetryCount + 1}`);
      }
    } finally {
      setNotificationLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      console.log('Fetching analytics data...');
      setLoading(true);
      
      // Fetch delivery trends with error handling
      try {
        const trendsRes = await axios.get("http://localhost:5000/api/analytics/transporter-trends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Trends response:', trendsRes.data);
        setTrends(Array.isArray(trendsRes.data) ? trendsRes.data : []);
      } catch (trendsError) {
        console.error('Failed to fetch trends:', trendsError);
        setTrends([]);
      }

      // Fetch transporter metrics with error handling
      try {
        const metricsRes = await axios.get("http://localhost:5000/api/analytics/transporter-metrics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Metrics response:', metricsRes.data);
        const metricsData = metricsRes.data || {};
        setTransportMetrics(metricsData);
        setFuelData(metricsData.fuelEfficiency || {
          avgFuelEconomy: '12.5',
          monthlyFuelCost: 18000,
          co2Emissions: 400,
          totalDistance: 12000
        });
      } catch (metricsError) {
        console.error('Failed to fetch metrics:', metricsError);
        // Set default metrics
        const defaultMetrics = {
          avgDeliveryTime: 24,
          onTimeDeliveryRate: 85,
          completionRate: 92,
          fuelEfficiency: {
            avgFuelEconomy: '12.5',
            monthlyFuelCost: 18000,
            co2Emissions: 400,
            totalDistance: 12000
          }
        };
        setTransportMetrics(defaultMetrics);
        setFuelData(defaultMetrics.fuelEfficiency);
      }
      
      // Force re-render
      setRenderKey(prev => prev + 1);
      setLoading(false);
    } catch (err) {
      console.error("Analytics fetch failed", err);
      // Set fallback data
      setTrends([]);
      setTransportMetrics({
        avgDeliveryTime: 24,
        onTimeDeliveryRate: 85,
        completionRate: 92
      });
      setFuelData({
        avgFuelEconomy: '12.5',
        monthlyFuelCost: 18000,
        co2Emissions: 400
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Transporter Dashboard – AgriSync";
    if (user?.role !== "transporter") {
      navigate(`/${user?.role || "login"}/dashboard`);
      return;
    }
    fetchDeliveries();
    fetchNotifications();
    fetchAnalytics();
    
    // Set up notification polling with exponential backoff for rate limiting
    const setupNotificationPolling = () => {
      // Base interval: 30 seconds (much more reasonable than 5 seconds)
      const baseInterval = 30000;
      // Calculate actual interval based on retry count (exponential backoff)
      const interval = baseInterval * Math.pow(2, Math.min(notificationRetryCount, 4)); // Max 8 minutes
      
      return setInterval(fetchNotifications, interval);
    };
    
    const intervalId = setupNotificationPolling();
    return () => clearInterval(intervalId);
  }, [user?.id, user?.role, notificationRetryCount]);

  const switchRole = (newRole) => {
    navigate(`/${newRole}/dashboard`);
  };

  // Profile management
  const updateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    
    // Validate form
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setProfileError('New passwords do not match');
      setProfileLoading(false);
      return;
    }
    
    if (profileForm.newPassword && !profileForm.currentPassword) {
      setProfileError('Current password is required to change password');
      setProfileLoading(false);
      return;
    }
    
    try {
      const updateData = {
        location: profileForm.location || user.location,
        phone: profileForm.phone || user.phone
      };
      
      // Add password fields if user wants to change password
      if (profileForm.newPassword) {
        updateData.currentPassword = profileForm.currentPassword;
        updateData.newPassword = profileForm.newPassword;
      }
      
      const response = await axios.put('http://localhost:5000/api/auth/profile', updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local storage with new user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Reset form
      setProfileForm({
        location: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setShowEditProfileModal(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile', err);
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };
  
  const openEditProfile = () => {
    setProfileForm({
      location: user.location || '',
      phone: user.phone || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setProfileError('');
    setShowProfileModal(false);
    setShowEditProfileModal(true);
  };

  // Enhanced analytics calculations with detailed logging
  console.log('=== DELIVERIES DATA ANALYSIS ===');
  console.log('Raw deliveries array:', deliveries);
  console.log('Deliveries count:', deliveries.length);
  
  // Status breakdown with detailed logging
  const deliveredList = deliveries.filter(d => d.status === 'delivered');
  const inTransitList = deliveries.filter(d => d.status === 'in_transit');
  const assignedList = deliveries.filter(d => d.status === 'assigned');
  const pendingList = deliveries.filter(d => d.status === 'pending');
  
  console.log('Delivered deliveries:', deliveredList);
  console.log('In-transit deliveries:', inTransitList);
  console.log('Assigned deliveries:', assignedList);
  console.log('Pending deliveries:', pendingList);
  
  // Count each status
  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveredList.length;
  const inTransitDeliveries = inTransitList.length;
  const pendingDeliveries = assignedList.length; // Note: using 'assigned' for pending count
  const actualPendingDeliveries = pendingList.length;
  
  console.log('Stats calculations:');
  console.log('- Total deliveries:', totalDeliveries);
  console.log('- Completed (delivered):', completedDeliveries);
  console.log('- In transit:', inTransitDeliveries);
  console.log('- Assigned/Pending:', pendingDeliveries);
  console.log('- Actual pending:', actualPendingDeliveries);
  
  const completionRate = totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : 0;
  console.log('- Completion rate:', completionRate + '%');
  console.log('=== END DELIVERIES ANALYSIS ===');
  const todayDeliveries = deliveries.filter(d => 
    new Date(d.createdAt).toDateString() === new Date().toDateString()
  ).length;

  // Prepare chart data
  const deliveryStatusData = [
    { name: 'Pending', value: pendingDeliveries, fill: '#F59E0B' },
    { name: 'In Transit', value: inTransitDeliveries, fill: '#0EA5E9' },
    { name: 'Delivered', value: completedDeliveries, fill: '#10B981' }
  ];

  const filteredDeliveries = deliveries
    // Defensive guard: ensure delivered/cancelled never show in the active list render
    .filter(d => ['assigned', 'in_transit', 'pending'].includes(d.status))
    .filter(delivery => 
      (statusFilter === 'all' || delivery.status === statusFilter) &&
      (searchTerm === '' || 
       delivery.goodsDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       delivery.pickupLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       delivery.dropoffLocation?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  // Debug logging for state values
  console.log('Current state values:');
  console.log('transportMetrics:', transportMetrics);
  console.log('fuelData:', fuelData);
  console.log('trends:', trends);
  console.log('activeTab:', activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-sky-200/30 to-blue-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-sky-300/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-100/20 to-indigo-100/20 rounded-full blur-3xl"></div>
      </div>
      
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">AgriSync</h1>
                  <p className="text-xs text-gray-500">Transport Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <Bell className="h-6 w-6 text-gray-600 cursor-pointer hover:text-sky-600 transition-colors duration-200" onClick={() => setShowNotifModal(true)} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-3 py-2 cursor-pointer hover:bg-white/70 transition-all duration-200 shadow-sm" onClick={() => setShowProfileModal(true)}>
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center hidden md:block">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full text-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 relative z-10">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                  Welcome back, {user?.name}! 🚛
                </h2>
                <p className="text-gray-600 text-lg">Managing deliveries and transport operations.</p>
                <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{user?.location || 'Transport Hub'}</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center">
                      <Truck className="h-16 w-16 text-sky-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 relative z-10">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2">
            {/* Mobile Tab Navigation - Dropdown */}
            <div className="md:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-none bg-white/50 text-gray-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="overview">📊 Overview</option>
                <option value="deliveries">📦 Deliveries</option>
                <option value="routes">🧭 Routes</option>
                <option value="analytics">📈 Analytics</option>
                <option value="reports">📄 Reports</option>
              </select>
            </div>
            
            {/* Desktop Tab Navigation */}
            <nav className="hidden md:flex md:space-x-2 lg:space-x-3">
              {[
                { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: BarChart3, color: 'sky' },
                { id: 'deliveries', label: 'Deliveries', shortLabel: 'Delivery', icon: Package, color: 'blue' },
                { id: 'routes', label: 'Routes', shortLabel: 'Routes', icon: Navigation, color: 'indigo' },
                { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: TrendingUp, color: 'purple' },
                { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: FileText, color: 'green' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 md:px-4 lg:px-6 py-3 rounded-xl font-medium text-xs md:text-sm transition-all duration-200 transform ${
                      isActive
                        ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg scale-105`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-105'
                    }`}
                  >
                    <Icon className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                    <span className="hidden lg:block">{tab.label}</span>
                    <span className="lg:hidden">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                    <p className="text-3xl font-bold text-gray-900">{totalDeliveries}</p>
                    <p className="text-sm text-sky-600 font-medium">{todayDeliveries} today</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-3xl font-bold text-gray-900">{completionRate}%</p>
                    <p className="text-sm text-green-600 font-medium">{completedDeliveries} completed</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Transit</p>
                    <p className="text-3xl font-bold text-gray-900">{inTransitDeliveries}</p>
                    <p className="text-sm text-blue-600 font-medium">Active routes</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingDeliveries}</p>
                    <p className="text-sm text-orange-600 font-medium">Awaiting pickup</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Delivery Status Distribution */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-sky-600" />
                  Delivery Status Distribution
                </h3>
                {deliveryStatusData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deliveryStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deliveryStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No delivery data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                  Performance Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-sky-50 rounded-lg">
                    <span className="text-sm font-medium text-sky-800">Average Delivery Time</span>
                    <span className="text-lg font-bold text-sky-600">{transportMetrics?.avgDeliveryTime || '24'} hrs</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">On-Time Delivery Rate</span>
                    <span className="text-lg font-bold text-green-600">{transportMetrics?.onTimeDeliveryRate || '85'}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-800">Completion Rate</span>
                    <span className="text-lg font-bold text-purple-600">{transportMetrics?.completionRate || '92'}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-orange-800">Fuel Efficiency</span>
                    <span className="text-lg font-bold text-orange-600">{fuelData?.avgFuelEconomy || '12.5'} km/l</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('deliveries')}
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-sky-50 to-sky-100 rounded-lg hover:from-sky-100 hover:to-sky-200 transition-all duration-200 group"
                >
                  <Package className="h-8 w-8 text-sky-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-sky-700">View Deliveries</span>
                </button>
                <button
                  onClick={() => setActiveTab('routes')}
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
                >
                  <Navigation className="h-8 w-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-blue-700">Plan Routes</span>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group"
                >
                  <BarChart3 className="h-8 w-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-purple-700">View Analytics</span>
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 group"
                >
                  <FileText className="h-8 w-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-green-700">Generate Reports</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search deliveries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white/70"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white/70"
                >
                  <option value="all">All Status</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>

            {/* Location Service for Transporters */}
            {activeDeliveryId && TransporterLocationService && (
              <div className="mb-6">
                <TransporterLocationService
                  isActive={isLocationSharing}
                  deliveryId={activeDeliveryId}
                  autoStart={isLocationSharing}
                  onLocationUpdate={(location) => {
                    // Handle location updates and sync with backend
                    console.log('Location update received:', location);
                    if (location && activeDeliveryId && isLocationSharing) {
                      updateLocation();
                    }
                  }}
                  onError={(error) => {
                    setLocationError(error);
                  }}
                />
              </div>
            )}

            {/* Location Error Display & Help */}
            {locationError && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    {isRetrying ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800 mb-2">
                      {isRetrying ? 'Retrying Location Access...' : 'Location Access Issue'}
                    </h4>
                    <p className="text-red-700 text-sm mb-4 whitespace-pre-line">{locationError}</p>
                    
                    {/* Help Instructions */}
                    <div className="bg-red-100 rounded-lg p-4 border border-red-200">
                      <h5 className="font-medium text-red-800 mb-2">How to fix this:</h5>
                      <ol className="text-red-700 text-sm space-y-1 list-decimal list-inside">
                        <li>Look for the location icon 📍 in your browser's address bar</li>
                        <li>Click on it and select "Allow" for location access</li>
                        <li>If no icon appears, go to browser Settings → Privacy → Location</li>
                        <li>Make sure location services are enabled on your device</li>
                        <li>Try moving to an outdoor location with clear sky view</li>
                        <li>Refresh this page and try again</li>
                      </ol>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => window.location.reload()}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                          disabled={isRetrying}
                        >
                          Refresh Page
                        </button>
                        <button
                          onClick={() => {
                            setLocationError(null);
                            setRetryCount(0);
                            setIsRetrying(false);
                          }}
                          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                          disabled={isRetrying}
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => {
                            setUseMockLocation(true);
                            setLocationError(null);
                            setRetryCount(0);
                            setIsRetrying(false);
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                          disabled={isRetrying}
                        >
                          🎭 Use Mock Location (Testing)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mock Location Status */}
            {useMockLocation && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">🎭</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800">Mock Location Mode Active</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      Using simulated location (Kathmandu: 27.7172, 85.3240) for testing. 
                      Location sharing will work with mock coordinates.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUseMockLocation(false);
                      if (isLocationSharing) {
                        // Restart location sharing with real GPS
                        stopLocationSharing();
                      }
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Disable Mock
                  </button>
                </div>
              </div>
            )}
            
            {/* GPS Debug Panel */}
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">🔍 GPS Debug Panel</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      setUseMockLocation(false);
                      console.log('🚀 Force using real GPS...');
                      
                      if (activeDeliveryId && isLocationSharing) {
                        console.log('🔄 Triggering immediate real GPS update...');
                        await updateLocation();
                      } else {
                        console.log('⚠️ No active delivery to update location for');
                      }
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    🌍 Force Real GPS
                  </button>
                  <button
                    onClick={() => {
                      console.log('=== LOCATION DEBUG INFO ===');
                      console.log('useMockLocation:', useMockLocation);
                      console.log('isLocationSharing:', isLocationSharing);
                      console.log('activeDeliveryId:', activeDeliveryId);
                      console.log('liveLocation:', liveLocation);
                      console.log('navigator.geolocation available:', !!navigator.geolocation);
                      console.log('=== END DEBUG ===');
                    }}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    📋 Debug Log
                  </button>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Mock Mode:</strong> {useMockLocation ? '🎭 Active' : '❌ Disabled'}</p>
                <p><strong>Location Sharing:</strong> {isLocationSharing ? '✅ Active' : '❌ Inactive'}</p>
                <p><strong>Live Location Data:</strong> {liveLocation ? `📍 ${Number(liveLocation.latitude).toFixed(6)}, ${Number(liveLocation.longitude).toFixed(6)}` : '❌ None'}</p>
                <p><strong>GPS Available:</strong> {navigator.geolocation ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>

            <div className="grid gap-6">
              {filteredDeliveries.length e 0 ? (
                filteredDeliveries.map((delivery, index) =e (
                  cdiv key={delivery._id || index} className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center">
                          <Package className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{delivery.goodsDescription || 'Unknown Item'}</h4>
                          <p className="text-sm text-gray-500">Quantity: {delivery.quantity} units</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          delivery.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {delivery.status === 'assigned' ? 'Pending' : delivery.status === 'in_transit' ? 'In Transit' : 'Delivered'}
                        </span>
                        {delivery.status === 'assigned' && (
                          <>
                            <button
                              onClick={() => viewRouteInTab(delivery._id)}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center"
                            >
                              <Route className="h-4 w-4 mr-1" />
                              View Route
                            </button>
                            <button
                              onClick={async () => {
                                console.log('🚛 Starting transit for delivery:', delivery._id);
                                
                                // 1. Update status to in_transit
                                await updateStatus(delivery._id, 'in_transit');
                                
                                // 2. Start automatic location sharing
                                startLocationSharing(delivery._id);
                                
                                // 3. Fetch and display route to pickup location
                                await viewRouteInTab(delivery._id);
                                
                                console.log('✅ Auto-transit flow initiated: location sharing + route to pickup');
                              }}
                              className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 flex items-center"
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              Start Transit
                            </button>
                          </>
                        )}
                        {delivery.status === 'in_transit' && !delivery.pickedUp && (
                          <>
                            <button
                              onClick={() => markAsPickedUp(delivery._id)}
                              disabled={pickupLoading === delivery._id}
                              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-lg text-sm hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center disabled:opacity-50"
                            >
                              {pickupLoading === delivery._id ? (
                                <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Package className="h-4 w-4 mr-1" />
                              )}
                              Mark Picked Up
                            </button>
                            <button
                              onClick={() => viewRouteInTab(delivery._id)}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center"
                            >
                              <Route className="h-4 w-4 mr-1" />
                              View Route
                            </button>
                            {activeDeliveryId === delivery._id && isLocationSharing ? (
                              <button
                                onClick={stopLocationSharing}
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg text-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center"
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                Stop Sharing
                              </button>
                            ) : (
                              <button
                                onClick={() => startLocationSharing(delivery._id)}
                                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center"
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                Share Location
                              </button>
                            )}
                          </>
                        )}
                        {delivery.status === 'in_transit' && delivery.pickedUp && (
                          <>
                            <span className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Items Picked Up
                            </span>
                            <button
                              onClick={() => viewRouteInTab(delivery._id)}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center"
                            >
                              <Route className="h-4 w-4 mr-1" />
                              View Route
                            </button>
                            <button
                              onClick={async () => {
                                console.log('✅ Marking delivery as completed for:', delivery._id);
                                
                                // 1. Update status to delivered
                                await updateStatus(delivery._id, 'delivered');
                                
                                // 2. Automatically stop location sharing
                                stopLocationSharing();
                                
                                console.log('🔄 Delivery completed: status updated + location sharing stopped');
                              }}
                              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg text-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Delivered
                            </button>
                            {activeDeliveryId === delivery._id && isLocationSharing ? (
                              <button
                                onClick={stopLocationSharing}
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-lg text-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center"
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                Stop Sharing
                              </button>
                            ) : (
                              <button
                                onClick={() => startLocationSharing(delivery._id)}
                                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center"
                              >
                                <MapPin className="h-4 w-4 mr-1" />
                                Share Location
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">From</p>
                        <p className="font-medium">{delivery.pickupLocation || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">To</p>
                        <p className="font-medium">{delivery.dropoffLocation || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-medium">{new Date(delivery.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Priority</p>
                        <p className="font-medium capitalize">{delivery.urgency || 'Normal'}</p>
                      </div>
                    </div>
                    
                    {/* Scheduling Information */}
                    {(delivery.scheduledPickupTime || delivery.scheduledDeliveryTime || delivery.pickedUpAt) && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Schedule & Timeline
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          {delivery.scheduledPickupTime && (
                            <div>
                              <p className="text-blue-600 font-medium">Scheduled Pickup</p>
                              <p className="text-gray-700">{new Date(delivery.scheduledPickupTime).toLocaleString()}</p>
                            </div>
                          )}
                          {delivery.pickedUpAt && (
                            <div>
                              <p className="text-green-600 font-medium">✅ Picked Up At</p>
                              <p className="text-gray-700">{new Date(delivery.pickedUpAt).toLocaleString()}</p>
                            </div>
                          )}
                          {delivery.scheduledDeliveryTime && (
                            <div>
                              <p className="text-purple-600 font-medium">Expected Delivery</p>
                              <p className="text-gray-700">{new Date(delivery.scheduledDeliveryTime).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white/70 backdrop-blur-sm p-12 rounded-2xl shadow-lg border border-white/20 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No deliveries found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            {/* Route Management Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Active Routes Summary */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">🚛 Active Routes</h3>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {filteredDeliveries.filter(d => d.status === 'in_transit' || d.status === 'assigned').length}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredDeliveries.filter(d => d.status === 'in_transit' || d.status === 'assigned').slice(0, 3).map((delivery, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{delivery.goodsDescription || 'Delivery'}</p>
                        <p className="text-xs text-gray-500">{delivery.pickupLocation}</p>
                      </div>
                      <button
                        onClick={() => viewRouteInTab(delivery._id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  ))}
                  {filteredDeliveries.filter(d => d.status === 'in_transit' || d.status === 'assigned').length === 0 && (
                    <p className="text-gray-500 text-sm">No active routes</p>
                  )}
                </div>
              </div>

              {/* Live Location Status */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">📍 Live Tracking</h3>
                  <div className="flex items-center space-x-2">
                    {isTrackingLive ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-600 font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-500 font-medium">Inactive</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {isTrackingLive ? (
                    liveLocation ? (
                      <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="font-semibold">📡 Live Location Active</span>
                        </div>
                        <p className="text-xs text-green-700 mb-1">Your location is being tracked and displayed on the route map.</p>
                        <p className="text-xs text-gray-600">Last updated: {liveLocation.timestamp ? new Date(liveLocation.timestamp).toLocaleTimeString() : 'Unknown'}</p>
                        <p className="text-xs text-gray-600 font-mono">{liveLocation.latitude?.toFixed(6)}, {liveLocation.longitude?.toFixed(6)}</p>
                      </div>
                    ) : (
                      <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-semibold">🔄 Searching for Live Location</span>
                        </div>
                        <p className="text-xs text-blue-700 mb-1">Looking for active deliveries with location sharing...</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>• Checking for deliveries in "assigned" or "in_transit" status</p>
                          <p>• Verifying location sharing is active on those deliveries</p>
                          <p>• This updates every 30 seconds</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="font-semibold">⏸ Live Location Tracking Inactive</span>
                      </div>
                      <p className="text-xs text-gray-700 mb-2">Switch to the Routes tab to enable live location tracking.</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>To see your live location:</strong></p>
                        <p>1. Have an active delivery (assigned or in-transit)</p>
                        <p>2. Start location sharing on that delivery</p>
                        <p>3. View the Routes tab</p>
                      </div>
                    </div>
                  )}
                  {liveLocationError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold">❌ Live Location Error</span>
                      </div>
                      <p className="text-xs text-red-700">{liveLocationError}</p>
                    </div>
                  )}
                  
                  {/* Help Section */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-700 mb-1">💡 How Live Location Works:</p>
                    <p>Your live location is tracked only when you have an active delivery and are sharing your location.</p>
                    <p className="mt-1">The admin can always see your location when you're sharing it, but you can only see it here when actively working on a delivery.</p>
                  </div>
                </div>
              </div>

              {/* Third column placeholder for potential future content */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">🚀 Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('deliveries')}
                    className="w-full flex items-center justify-center p-3 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors text-sm font-medium text-sky-700"
                  >
                    📦 View Deliveries
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="w-full flex items-center justify-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium text-purple-700"
                  >
                    📊 View Analytics
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full flex items-center justify-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </div>
            {/* Selected Route Details */}
            {routeData && routeDelivery && (
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                    🗺️ Delivery Route - {routeData.pickup?.contact?.name || routeDelivery.farmerId?.name || routeDelivery.farmer?.name || 'Unknown Requester'}
                    {routeData.requesterType && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                        {routeData.requesterType === 'market_vendor' ? 'Vendor' : 'Farmer'}
                      </span>
                    )}
                  </h3>
                  <button
                    onClick={() => {
                      setRouteData(null);
                      setRouteDelivery(null);
                      setSelectedDeliveryRoute(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-sm flex items-center"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Route
                  </button>
                </div>
                
                {/* Route Summary */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">
                      📍 Pickup Location
                    </h4>
                    <p className="text-sm text-gray-700">{routeData.pickup?.location || routeDelivery.pickupLocation}</p>
                    {routeData.pickup?.coordinates && (
                      <p className="text-xs text-gray-500 mt-1">
                        Coordinates: {routeData.pickup.coordinates.latitude?.toFixed(4)}, {routeData.pickup.coordinates.longitude?.toFixed(4)}
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">
                      🏭 Warehouse Location
                    </h4>
                    <p className="text-sm text-gray-700">{routeData.delivery?.warehouse?.name || routeData.delivery?.location || 'Main Warehouse'}</p>
                    {routeData.delivery?.coordinates && (
                      <p className="text-xs text-gray-500 mt-1">
                        Coordinates: {routeData.delivery.coordinates.latitude?.toFixed(4)}, {routeData.delivery.coordinates.longitude?.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Details */}
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">Delivery Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Items</p>
                      <p className="font-medium">{routeDelivery.items?.length || 0} item(s)</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Priority</p>
                      <p className="font-medium capitalize">{routeDelivery.urgency || 'Normal'}</p>
                    </div>
                    {routeDelivery.scheduledPickupTime && (
                      <div>
                        <p className="text-gray-500">Scheduled Pickup</p>
                        <p className="font-medium text-xs">{new Date(routeDelivery.scheduledPickupTime).toLocaleString()}</p>
                      </div>
                    )}
                    {routeDelivery.scheduledDeliveryTime && (
                      <div>
                        <p className="text-gray-500">Expected Delivery</p>
                        <p className="font-medium text-xs">{new Date(routeDelivery.scheduledDeliveryTime).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items List */}
                {routeDelivery.items && routeDelivery.items.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-800 mb-3">Items to Pickup</h4>
                    <div className="space-y-2">
                      {routeDelivery.items.map((item, index) => (
                        <div key={index} className="bg-white p-3 rounded border flex justify-between items-center">
                          <div>
                            <p className="font-medium">{item.crop}</p>
                            <p className="text-sm text-gray-600">{item.quantity} {item.unit}</p>
                          </div>
                          📦
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Route Instructions */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-2">📋 Instructions</h4>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Navigate to the pickup location shown above</li>
                    <li>Contact the {routeData.requesterType === 'market_vendor' ? 'vendor' : 'farmer'}: {routeData.pickup?.contact?.email || routeDelivery.farmerId?.phone || routeDelivery.farmer?.phone || 'N/A'}</li>
                    <li>Verify and collect all items listed above</li>
                    <li>Mark items as "Picked Up" in the deliveries tab</li>
                    <li>Navigate to the warehouse for delivery</li>
                    <li>Complete delivery and update status</li>
                  </ol>
                </div>
                
                            {/* Interactive Route Map */}
                <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b bg-gray-50">
                    <h4 className="font-medium text-gray-800 flex items-center">
                      🗺️ Interactive Route Map
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {(() => {
                          const pickupValid = routeData?.pickup?.coordinates?.latitude && routeData?.pickup?.coordinates?.longitude;
                          const deliveryValid = routeData?.delivery?.coordinates?.latitude && routeData?.delivery?.coordinates?.longitude;
                          return `P:${pickupValid ? '✅' : '❌'} D:${deliveryValid ? '✅' : '❌'}`;
                        })()
                      }
                      </span>
                    </h4>
                    <div className="mt-2 text-xs text-gray-600">
                      <p><strong>Pickup:</strong> {routeData?.pickup?.location} 
                        ({routeData?.pickup?.coordinates?.latitude?.toFixed(4) || 'N/A'}, {routeData?.pickup?.coordinates?.longitude?.toFixed(4) || 'N/A'})</p>
                      <p><strong>Delivery:</strong> {routeData?.delivery?.location} 
                        ({routeData?.delivery?.coordinates?.latitude?.toFixed(4) || 'N/A'}, {routeData?.delivery?.coordinates?.longitude?.toFixed(4) || 'N/A'})</p>
                    </div>
                  </div>
                  <div className="h-96 relative">
                    {(() => {
                      // Enhanced debugging for route coordinates
                      console.log('🗺️ Route Map Validation Debug:');
                      console.log('   - routeData:', routeData);
                      console.log('   - routeData.pickup:', routeData.pickup);
                      console.log('   - routeData.delivery:', routeData.delivery);
                      console.log('   - pickup coordinates:', routeData.pickup?.coordinates);
                      console.log('   - delivery coordinates:', routeData.delivery?.coordinates);
                      
                      const pickupLat = routeData.pickup?.coordinates?.latitude;
                      const pickupLng = routeData.pickup?.coordinates?.longitude;
                      const deliveryLat = routeData.delivery?.coordinates?.latitude;
                      const deliveryLng = routeData.delivery?.coordinates?.longitude;
                      
                      console.log('   - pickupLat:', pickupLat, 'type:', typeof pickupLat);
                      console.log('   - pickupLng:', pickupLng, 'type:', typeof pickupLng);
                      console.log('   - deliveryLat:', deliveryLat, 'type:', typeof deliveryLat);
                      console.log('   - deliveryLng:', deliveryLng, 'type:', typeof deliveryLng);
                      
                      console.log('   - pickupLat exists:', !!pickupLat);
                      console.log('   - pickupLng exists:', !!pickupLng);
                      console.log('   - deliveryLat exists:', !!deliveryLat);
                      console.log('   - deliveryLng exists:', !!deliveryLng);
                      
                      console.log('   - pickupLat isNaN:', isNaN(pickupLat));
                      console.log('   - pickupLng isNaN:', isNaN(pickupLng));
                      console.log('   - deliveryLat isNaN:', isNaN(deliveryLat));
                      console.log('   - deliveryLng isNaN:', isNaN(deliveryLng));
                      
                      // Convert to numbers to handle string coordinates
                      const numPickupLat = Number(pickupLat);
                      const numPickupLng = Number(pickupLng);
                      const numDeliveryLat = Number(deliveryLat);
                      const numDeliveryLng = Number(deliveryLng);
                      
                      console.log('   - numPickupLat:', numPickupLat);
                      console.log('   - numPickupLng:', numPickupLng);
                      console.log('   - numDeliveryLat:', numDeliveryLat);
                      console.log('   - numDeliveryLng:', numDeliveryLng);
                      
                      // Updated validation: show map if at least pickup coordinates are valid
                      const hasPickup = !isNaN(numPickupLat) && !isNaN(numPickupLng) && numPickupLat !== 0 && numPickupLng !== 0;
                      const hasDelivery = !isNaN(numDeliveryLat) && !isNaN(numDeliveryLng) && numDeliveryLat !== 0 && numDeliveryLng !== 0;
                      const isValid = hasPickup; // Show map if pickup coordinates exist
                      
                      console.log('   - hasPickup:', hasPickup);
                      console.log('   - hasDelivery:', hasDelivery);
                      console.log('   - Map should show:', isValid);
                      console.log('🗺️ End Route Map Validation Debug');
                      
                      return isValid;
                    })() ? (
                      (() => {
                        // Calculate map center based on available coordinates
                        const pickupLat = Number(routeData.pickup.coordinates.latitude);
                        const pickupLng = Number(routeData.pickup.coordinates.longitude);
                        const deliveryLat = Number(routeData.delivery?.coordinates?.latitude);
                        const deliveryLng = Number(routeData.delivery?.coordinates?.longitude);
                        
                        const hasDelivery = !isNaN(deliveryLat) && !isNaN(deliveryLng) && deliveryLat !== 0 && deliveryLng !== 0;
                        
                        const mapCenter = hasDelivery 
                          ? [(pickupLat + deliveryLat) / 2, (pickupLng + deliveryLng) / 2]
                          : [pickupLat, pickupLng]; // Center on pickup if no delivery coordinates
                        
                        console.log('🗺️ Map center calculated:', mapCenter, 'hasDelivery:', hasDelivery);
                        
                        return (
                          <MapContainer
                            center={mapCenter}
                            zoom={hasDelivery ? 12 : 15} // Zoom in more if only showing pickup
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            
                            {/* Pickup Location */}
                            <Marker 
                              position={[pickupLat, pickupLng]}
                              icon={pickupIcon}
                            >
                              <Popup>
                                <div className="p-2">
                                  <h5 className="font-semibold text-green-800">🌾 Pickup Location</h5>
                                  <p className="text-sm">{routeData.pickup.location || routeDelivery.pickupLocation}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {pickupLat?.toFixed(4)}, {pickupLng?.toFixed(4)}
                                  </p>
                                </div>
                              </Popup>
                            </Marker>
                            
                            {/* Dropoff Location - only show if coordinates exist */}
                            {hasDelivery && (
                              <Marker 
                                position={[deliveryLat, deliveryLng]}
                                icon={dropoffIcon}
                              >
                                <Popup>
                                  <div className="p-2">
                                    <h5 className="font-semibold text-blue-800">🏭 Dropoff Location</h5>
                                    <p className="text-sm">{routeData.delivery?.warehouse?.name || routeData.delivery?.location || 'Warehouse'}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {deliveryLat?.toFixed(4)}, {deliveryLng?.toFixed(4)}
                                    </p>
                                  </div>
                                </Popup>
                              </Marker>
                            )}
                            
                            {/* Live Location Marker - Show transporter's current position */}
                            {(() => {
                              console.log('🚛 Live Location Marker Debug:');
                              console.log('   - liveLocation:', liveLocation);
                              console.log('   - liveLocation type:', typeof liveLocation);
                              console.log('   - liveLocation.latitude:', liveLocation?.latitude);
                              console.log('   - liveLocation.longitude:', liveLocation?.longitude);
                              console.log('   - isLocationSharing:', isLocationSharing);
                              console.log('   - activeDeliveryId:', activeDeliveryId);
                              console.log('   - selectedDeliveryRoute:', selectedDeliveryRoute);
                              console.log('   - useMockLocation:', useMockLocation);
                              
                              // Enhanced validation for live location
                              const hasValidLiveLocation = liveLocation && 
                                                         typeof liveLocation.latitude === 'number' && 
                                                         typeof liveLocation.longitude === 'number' &&
                                                         !isNaN(liveLocation.latitude) && 
                                                         !isNaN(liveLocation.longitude) &&
                                                         liveLocation.latitude !== 0 && 
                                                         liveLocation.longitude !== 0;
                              
                              console.log('   - hasValidLiveLocation:', hasValidLiveLocation);
                              
                              // Show live location if:
                              // 1. We have valid live location data, OR  
                              // 2. We're actively sharing location for this delivery (with mock as fallback)
                              const shouldShowLiveLocation = hasValidLiveLocation || 
                                (isLocationSharing && activeDeliveryId === selectedDeliveryRoute);
                              
                              console.log('   - shouldShowLiveLocation:', shouldShowLiveLocation);
                              
                              if (shouldShowLiveLocation) {
                                // ALWAYS prioritize live GPS over mock location
                                let currentLat, currentLng, locationSource;
                                
                                if (hasValidLiveLocation) {
                                  // Use real GPS data - this takes priority over everything
                                  currentLat = Number(liveLocation.latitude);
                                  currentLng = Number(liveLocation.longitude);
                                  locationSource = 'Live GPS (Real)';
                                  console.log('   - ✅ Using REAL GPS location:', currentLat, currentLng);
                                  console.log('   - GPS timestamp:', liveLocation.timestamp || liveLocation.lastUpdated || 'unknown');
                                } else if (isLocationSharing && activeDeliveryId === selectedDeliveryRoute && useMockLocation) {
                                  // Only use mock if no real GPS is available AND we're actively sharing
                                  const jitter = (Math.random() - 0.5) * 0.002;
                                  currentLat = MOCK_LOCATION.latitude + jitter;
                                  currentLng = MOCK_LOCATION.longitude + jitter;
                                  locationSource = 'Mock Location (Fallback)';
                                  console.log('   - ⚠️ Using mock location as fallback:', currentLat, currentLng);
                                } else {
                                  console.log('   - ❌ No valid location source available');
                                  return null;
                                }
                                
                                if (!isNaN(currentLat) && !isNaN(currentLng)) {
                                  return (
                                    <Marker 
                                      position={[currentLat, currentLng]}
                                      icon={liveLocationIcon}
                                      zIndexOffset={1000}
                                    >
                                      <Popup>
                                        <div className="p-3">
                                          <h5 className="font-semibold text-green-800 flex items-center mb-2">
                                            🚛 Your Current Location
                                            <span className="ml-2 inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                          </h5>
                                          <div className="mb-2">
                                            <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                                              locationSource.includes('Real') 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                              {locationSource}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                                            {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                                          </p>
                                          {liveLocation?.timestamp && (
                                            <p className="text-xs text-green-600 mt-2 font-medium">
                                              Updated: {new Date(liveLocation.timestamp).toLocaleTimeString()}
                                            </p>
                                          )}
                                          {liveLocation?.lastUpdated && (
                                            <p className="text-xs text-green-600 mt-1 font-medium">
                                              Last Updated: {new Date(liveLocation.lastUpdated).toLocaleTimeString()}
                                            </p>
                                          )}
                                          <p className="text-xs text-green-600 mt-1 font-medium">
                                            ✅ Live tracking active
                                          </p>
                                        </div>
                                      </Popup>
                                    </Marker>
                                  );
                                }
                              }
                              console.log('   - ❌ Live location marker NOT rendered');
                              return null;
                            })()}
                            
                            {/* Navigation Route from Current Location to Pickup */}
                            {(() => {
                              console.log('🚛 Navigation Route Rendering:');
                              console.log('   - liveLocation:', liveLocation);
                              console.log('   - navigationRoute:', navigationRoute);
                              console.log('   - routeLoading:', routeLoading);
                              
                              // Show navigation route if we have current location and pickup coordinates
                              if (liveLocation && pickupLat && pickupLng && navigationRoute?.coordinates) {
                                console.log('✅ Rendering navigation route with', navigationRoute.coordinates.length, 'points');
                                return (
                                  <Polyline
                                    positions={navigationRoute.coordinates}
                                    color="#F59E0B"
                                    weight={5}
                                    opacity={0.8}
                                    dashArray={navigationRoute.fallback ? "10, 10" : "0"}
                                  />
                                );
                              } else if (liveLocation && pickupLat && pickupLng && !navigationRoute && !routeLoading) {
                                // Simple direct line from current location to pickup as fallback
                                console.log('⚠️ Showing direct line as fallback');
                                const currentLat = Number(liveLocation.latitude);
                                const currentLng = Number(liveLocation.longitude);
                                
                                if (!isNaN(currentLat) && !isNaN(currentLng)) {
                                  return (
                                    <Polyline
                                      positions={[
                                        [currentLat, currentLng],
                                        [pickupLat, pickupLng]
                                      ]}
                                      color="#F59E0B"
                                      weight={4}
                                      opacity={0.6}
                                      dashArray="15, 10"
                                    />
                                  );
                                }
                              }
                              
                              console.log('❌ No navigation route to render');
                              return null;
                            })()}
                            
                            {/* Route Line between pickup and delivery - only show if both coordinates exist */}
                            {hasDelivery && (
                              <Polyline
                                positions={[
                                  [pickupLat, pickupLng],
                                  [deliveryLat, deliveryLng]
                                ]}
                                color="#3B82F6"
                                weight={4}
                                opacity={0.7}
                                dashArray="5, 10"
                              />
                            )}
                          </MapContainer>
                        );
                      })()
                    ) : (
                      <div className="flex flex-col h-full">
                        {/* Test Map */}
                        <div className="h-1/2 border-b">
                          <div className="p-2 bg-yellow-100 text-xs">
                            <strong>Test Map:</strong> This should always show (fixed coordinates)
                          </div>
                          <div className="h-full">
                            <MapContainer
                              center={[27.7172, 85.3240]} // Kathmandu coordinates
                              zoom={13}
                              style={{ height: '100%', width: '100%' }}
                            >
                              <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              />
                              <Marker position={[27.7172, 85.3240]}>
                                <Popup>Test marker in Kathmandu</Popup>
                              </Marker>
                            </MapContainer>
                          </div>
                        </div>
                        
                        {/* Debug info */}
                        <div className="flex items-center justify-center h-1/2 bg-gray-50">
                          <div className="text-center">
                            <div className="text-4xl mb-3">🗺️</div>
                            <p className="text-gray-500">Route coordinates not available</p>
                            <p className="text-sm text-gray-400 mt-1">Contact admin to set coordinates</p>
                            {/* Debug info */}
                            <div className="mt-4 text-xs text-gray-400 bg-white p-3 rounded border max-w-sm mx-auto">
                              <p>Debug Info:</p>
                              <p>Pickup: {routeData.pickup?.coordinates ? JSON.stringify(routeData.pickup.coordinates) : 'null'}</p>
                              <p>Delivery: {routeData.delivery?.coordinates ? JSON.stringify(routeData.delivery.coordinates) : 'null'}</p>
                              <p>Leaflet loaded: {typeof L !== 'undefined' ? 'Yes' : 'No'}</p>
                              <p>MapContainer imported: {MapContainer ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Real-time GPS Tester */}
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                📍 Live GPS Location Tester
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <GPSTester />
              </div>
            </div>

            {/* Route Optimization Component */}
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Route className="h-5 w-5 mr-2" />
                Route Optimization
              </h3>
              
              {RouteOptimization ? (
                <RouteOptimization 
                  deliveries={deliveries}
                  currentLocation={user?.location ? { lat: 19.0760, lng: 72.8777 } : null}
                  className=""
                />
              ) : (
                <div className="text-center py-8">
                  <Route className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">Route optimization is currently unavailable</p>
                  <p className="text-sm text-gray-400">Please refresh the page or try again later</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                  Delivery Trends
                </h3>
                {trends && trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#0EA5E9" strokeWidth={2} name="Total" />
                      <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} name="Delivered" />
                      <Line type="monotone" dataKey="in_transit" stroke="#F59E0B" strokeWidth={2} name="In Transit" />
                      <Line type="monotone" dataKey="assigned" stroke="#EF4444" strokeWidth={2} name="Assigned" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No delivery trends data available</p>
                      <p className="text-sm mt-2">Complete some deliveries to see trends</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Fuel className="h-5 w-5 mr-2 text-green-600" />
                  Performance Metrics
                </h3>
                {transportMetrics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">Average Delivery Time</span>
                      <span className="text-lg font-bold text-blue-600">{transportMetrics.avgDeliveryTime} hrs</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-800">On-Time Delivery Rate</span>
                      <span className="text-lg font-bold text-green-600">{transportMetrics.onTimeDeliveryRate}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-purple-800">Completion Rate</span>
                      <span className="text-lg font-bold text-purple-600">{transportMetrics.completionRate}%</span>
                    </div>
                    {fuelData && (
                      <React.Fragment>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                          <span className="text-sm font-medium text-orange-800">Fuel Economy</span>
                          <span className="text-lg font-bold text-orange-600">{fuelData.avgFuelEconomy} km/l</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                          <span className="text-sm font-medium text-red-800">Monthly Fuel Cost</span>
                          <span className="text-lg font-bold text-red-600">₹{fuelData.monthlyFuelCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-800">CO2 Emissions</span>
                          <span className="text-lg font-bold text-gray-600">{fuelData.co2Emissions} kg</span>
                        </div>
                      </React.Fragment>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <Fuel className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>Loading performance metrics...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-indigo-600" />
              Export Reports by Date
            </h3>
            <div className="flex gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <DatePicker 
                  selected={from} 
                  onChange={setFrom} 
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white/70" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <DatePicker 
                  selected={to} 
                  onChange={setTo} 
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white/70" 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a 
                href={buildUrl("http://localhost:5000/api/export/deliveries")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-sky-50 to-sky-100 rounded-lg hover:from-sky-100 hover:to-sky-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-sky-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-sky-700">Deliveries (CSV)</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/transport-summary")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-blue-700">Transport Summary</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/routes")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-green-700">Routes (CSV)</span>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Simple Notification Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" style={{backgroundColor: 'white', zIndex: 10000}}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-sky-800 flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notifications
                  {isRateLimited && (
                    <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">
                      Rate Limited
                    </span>
                  )}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchNotifications}
                    disabled={notificationLoading}
                    className="p-1 text-sky-600 hover:text-sky-800 transition-colors disabled:opacity-50"
                    title="Refresh notifications"
                  >
                    <RefreshCw className={`h-4 w-4 ${notificationLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await axios.put("http://localhost:5000/api/notifications/mark-read", {}, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchNotifications();
                      } catch (error) {
                        console.error('Failed to mark notifications as read:', error);
                      }
                    }}
                    className="text-sm text-sky-600 underline hover:text-sky-800 transition-colors"
                  >
                    Mark All Read
                  </button>
                  <button
                    onClick={() => setShowNotifModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications yet.</p>
                  <p className="text-sm text-gray-400 mt-1">You'll see updates about your deliveries here.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {notifications.map((note) => (
                    <div
                      key={note._id}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        note.read 
                          ? "bg-gray-50 border-gray-200 text-gray-600" 
                          : "bg-sky-50 border-sky-200 text-sky-900 shadow-sm"
                      }`}
                    >
                      <div className="font-medium">{note.title || 'Notification'}</div>
                      <div className="text-sm mt-1">{note.message}</div>
                      <div className="text-xs text-gray-500 mt-2 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(note.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Rate limiting info */}
              {isRateLimited && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center text-amber-800">
                    <Bell className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Notification updates slowed</p>
                      <p className="text-xs mt-1">
                        Auto-refresh is temporarily reduced due to rate limiting. 
                        Use the refresh button for manual updates.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" style={{backgroundColor: 'white', zIndex: 10000}}>
            <div className="p-6" style={{backgroundColor: 'white'}}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{user?.name}</h4>
                    <p className="text-sm text-gray-500">{user?.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Email:</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{user?.email}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Location:</span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{user?.location || 'Not specified'}</p>
                  </div>
                  {user?.phone && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Phone:</span>
                      </div>
                      <p className="text-sm text-gray-900 mt-1">{user.phone}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={openEditProfile}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" style={{backgroundColor: 'white', zIndex: 10000}}>
            <div className="p-6" style={{backgroundColor: 'white'}}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
                <button
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {profileError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{profileError}</p>
                </div>
              )}
              
              <form onSubmit={updateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="relative">
                    <MapPin className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                      placeholder={user?.location || 'Enter your location'}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      placeholder={user?.phone || 'Enter your phone number'}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Change Password (Optional)</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={profileForm.currentPassword}
                        onChange={(e) => setProfileForm({...profileForm, currentPassword: e.target.value})}
                        placeholder="Enter current password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                        placeholder="Confirm new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Update Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Route Modal */}
      <RouteModal 
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        routeData={routeData}
        delivery={routeDelivery}
      />
    </div>
  );
}

export default TransporterDashboard;
