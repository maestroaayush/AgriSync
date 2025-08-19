import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { Truck, MapPin, Clock, User, Phone, Mail } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon for transporters
const truckIcon = new L.DivIcon({
  html: `<div style="background-color: #3B82F6; border-radius: 50%; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16,8 20,8 23,11 23,16 16,16"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  </div>`,
  className: 'custom-truck-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// Custom farmer icon
const farmerIcon = new L.DivIcon({
  html: `<div style="background-color: #10B981; border-radius: 50%; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M3 21h18"></path>
      <path d="M5 21V7l8-4v18"></path>
      <path d="M19 21V11l-6-4"></path>
    </svg>
  </div>`,
  className: 'custom-farmer-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const TransporterMap = ({ farmerLocation, deliveries = [], showAllTransporters = false }) => {
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  // Default farmer location (can be passed as prop or fetched from user data)
  const defaultFarmerLocation = farmerLocation || [19.0760, 72.8777]; // Mumbai as default
  
  // Get assigned transporters from deliveries
  const assignedTransporterIds = useMemo(() => {
    return deliveries
      .filter(delivery => delivery.status === 'assigned' || delivery.status === 'in_transit')
      .map(delivery => delivery.transporterId)
      .filter(Boolean); // Remove null/undefined values
  }, [deliveries]);

  useEffect(() => {
    const fetchTransporters = async () => {
      try {
        setLoading(true);
        
        // Only fetch transporters if we have assigned deliveries or explicitly want to show all
        if (!showAllTransporters && assignedTransporterIds.length === 0) {
          setTransporters([]);
          setLoading(false);
          return;
        }
        
        // Try to fetch from API first
        try {
          const response = await axios.get('http://localhost:5000/api/transporters/locations', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          let filteredTransporters = response.data;
          
          // If not showing all, filter to only assigned transporters
          if (!showAllTransporters) {
            filteredTransporters = response.data.filter(transporter => 
              assignedTransporterIds.includes(transporter._id)
            );
          }
          
          setTransporters(filteredTransporters);
        } catch (apiError) {
          // If API fails and we have assigned deliveries, show relevant mock data
          if (assignedTransporterIds.length > 0 || showAllTransporters) {
            console.log('API not available, using mock data for assigned transporters');
            const mockTransporters = [
              {
                _id: '1',
                name: 'Rajesh Transport Services',
                email: 'rajesh@transport.com',
                phone: '+91-9876543210',
                location: 'Mumbai, Maharashtra',
                coordinates: [19.0760, 72.8777],
                status: 'busy', // Assigned transporter should be busy
                vehicleType: 'Truck',
                capacity: '10 tons',
                currentLoad: '7 tons',
                estimatedArrival: '2 hours',
                rating: 4.5,
                completedDeliveries: 145,
                assignedToUser: true
              }
            ];
            
            const simulatedTransporters = mockTransporters.map(t => ({
              ...t,
              coordinates: [
                t.coordinates[0] + (Math.random() - 0.5) * 0.01, // Small random movement
                t.coordinates[1] + (Math.random() - 0.5) * 0.01
              ],
              lastUpdated: new Date().toISOString(),
              isOnline: true // Assigned transporters should be online
            }));
            
            let filteredMockTransporters = simulatedTransporters;
            if (!showAllTransporters) {
              // Only show transporters that are "assigned" (mock scenario)
              filteredMockTransporters = simulatedTransporters.filter(t => t.assignedToUser);
            }
            
            setTransporters(filteredMockTransporters);
          } else {
            setTransporters([]);
          }
        }
      } catch (err) {
        console.error('Error fetching transporters:', err);
        setError('Failed to load transporter locations');
        setTransporters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransporters();

    // Only set up periodic updates if we have assigned transporters
    let interval;
    if (assignedTransporterIds.length > 0 || showAllTransporters) {
      interval = setInterval(fetchTransporters, 15000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, assignedTransporterIds, showAllTransporters]);

  const mapCenter = useMemo(() => {
    if (transporters.length > 0) {
      // Filter out transporters without valid coordinates
      const validTransporters = transporters.filter(t => 
        t.coordinates && Array.isArray(t.coordinates) && 
        t.coordinates.length >= 2 && 
        typeof t.coordinates[0] === 'number' && 
        typeof t.coordinates[1] === 'number'
      );
      
      if (validTransporters.length > 0) {
        const avgLat = validTransporters.reduce((sum, t) => sum + t.coordinates[0], 0) / validTransporters.length;
        const avgLng = validTransporters.reduce((sum, t) => sum + t.coordinates[1], 0) / validTransporters.length;
        return [avgLat, avgLng];
      }
    }
    return defaultFarmerLocation;
  }, [transporters, defaultFarmerLocation]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#10B981'; // Green
      case 'busy':
        return '#F59E0B'; // Orange
      case 'offline':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusIcon = (transporter) => {
    const color = getStatusColor(transporter.status);
    return new L.DivIcon({
      html: `<div style="background-color: ${color}; border-radius: 50%; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border: 3px solid white;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16,8 20,8 23,11 23,16 16,16"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      </div>`,
      className: 'custom-transporter-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transporter locations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }
  
  // Don't render anything if there are no transporters and not showing all
  if (!showAllTransporters && transporters.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Truck className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Deliveries</h3>
          <p className="text-gray-600 mb-4">
            Transporter locations will appear here when you have active deliveries with assigned transporters.
          </p>
          <p className="text-sm text-gray-500">
            Request a delivery to see live transporter tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Live Transporter Locations</h3>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-gray-600">Busy</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Offline</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Showing {transporters.length} transporters • Updated every 30 seconds
        </p>
      </div>

      <div className="h-96 relative">
        <MapContainer
          center={mapCenter}
          zoom={8}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Farmer location marker */}
          <Marker position={defaultFarmerLocation} icon={farmerIcon}>
            <Popup>
              <div className="p-2">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Your Farm</h4>
                    <p className="text-sm text-gray-600">Current Location</p>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Transporter markers */}
          {transporters
            .filter(transporter => 
              transporter.coordinates && 
              Array.isArray(transporter.coordinates) && 
              transporter.coordinates.length >= 2 &&
              typeof transporter.coordinates[0] === 'number' &&
              typeof transporter.coordinates[1] === 'number' &&
              !isNaN(transporter.coordinates[0]) &&
              !isNaN(transporter.coordinates[1])
            )
            .map((transporter) => (
            <Marker
              key={transporter._id || `transporter-${Math.random()}`}
              position={transporter.coordinates}
              icon={getStatusIcon(transporter)}
            >
              <Popup maxWidth={300}>
                <div className="p-3">
                  <div className="flex items-start space-x-3 mb-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: getStatusColor(transporter.status) }}
                    >
                      <Truck className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{transporter.name}</h4>
                      <div className="flex items-center space-x-1 mt-1">
                        <span 
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{ 
                            backgroundColor: `${getStatusColor(transporter.status)}20`,
                            color: getStatusColor(transporter.status)
                          }}
                        >
                          {transporter.status.charAt(0).toUpperCase() + transporter.status.slice(1)}
                        </span>
                        <div className="flex items-center text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <span key={`star-${transporter._id}-${i}`} className={i < Math.floor(transporter.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}>
                              ★
                            </span>
                          ))}
                          <span className="text-xs text-gray-600 ml-1">
                            ({transporter.rating || 'N/A'})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">{transporter.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">{transporter.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">{transporter.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">ETA: {transporter.estimatedArrival}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-gray-600">Vehicle:</span>
                        <span className="font-medium text-gray-900 ml-1">{transporter.vehicleType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Capacity:</span>
                        <span className="font-medium text-gray-900 ml-1">{transporter.capacity}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <div>
                        <span className="text-gray-600">Current Load:</span>
                        <span className="font-medium text-gray-900 ml-1">{transporter.currentLoad}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Trips:</span>
                        <span className="font-medium text-gray-900 ml-1">{transporter.completedDeliveries}</span>
                      </div>
                    </div>
                  </div>

                  {transporter.status === 'available' && (
                    <button className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      Request Delivery
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Statistics Panel */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {transporters.filter(t => t.status === 'available').length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {transporters.filter(t => t.status === 'busy').length}
            </div>
            <div className="text-sm text-gray-600">Busy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {transporters.length > 0 
                ? (Math.round(transporters.reduce((sum, t) => sum + (t.rating || 0), 0) / transporters.length * 10) / 10).toFixed(1)
                : '0.0'
              }
            </div>
            <div className="text-sm text-gray-600">Avg Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {transporters.reduce((sum, t) => sum + (t.completedDeliveries || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Trips</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransporterMap;
