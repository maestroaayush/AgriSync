import { useEffect, useState } from "react";
import api from "../../api/axios";
import axios from "axios";
import Modal from "../../components/Modal";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different user types
const createCustomIcon = (color, isLive = false) => {
  const pulseAnimation = isLive ? 'animation: pulse 2s infinite;' : '';
  const borderColor = isLive ? '#10B981' : 'white';
  const borderWidth = isLive ? '4px' : '3px';
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: ${borderWidth} solid ${borderColor}; box-shadow: 0 2px 5px rgba(0,0,0,0.3); ${pulseAnimation}"></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  });
};

const farmerIcon = createCustomIcon('#10B981'); // Green
const transporterIcon = createCustomIcon('#F59E0B'); // Orange/Yellow
const liveTransporterIcon = createCustomIcon('#F59E0B', true); // Orange/Yellow with pulse
const warehouseIcon = createCustomIcon('#3B82F6'); // Blue
const vendorIcon = createCustomIcon('#8B5CF6'); // Purple
const adminIcon = createCustomIcon('#EF4444'); // Red

// Interactive Map Component for Location Selection
function MapLocationPicker({ position, onLocationSelect, userRole }) {
  const [selectedPosition, setSelectedPosition] = useState(position || [27.705545, 85.333525]);
  
  // Component to handle map click events
  function LocationMarker() {
    useMapEvents({
      click(e) {
        const newPosition = [e.latlng.lat, e.latlng.lng];
        setSelectedPosition(newPosition);
        onLocationSelect(newPosition);
      },
    });

    return selectedPosition ? (
      <Marker position={selectedPosition}>
        <Popup>
          <div className="text-center">
            <strong>📍 Selected Location</strong><br />
            <small>
              Lat: {selectedPosition[0].toFixed(6)}<br />
              Lng: {selectedPosition[1].toFixed(6)}
            </small><br />
            <em>Click anywhere on the map to change location</em>
          </div>
        </Popup>
      </Marker>
    ) : null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-800 mb-1">How to set location:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Click anywhere on the map to set the precise location</li>
              <li>• Use the search box to find a specific address</li>
              <li>• Zoom in for more accuracy using the + button</li>
              <li>• The red marker shows the selected coordinates</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <MapContainer 
          center={selectedPosition} 
          zoom={13} 
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationMarker />
        </MapContainer>
      </div>
      
      {selectedPosition && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Selected Coordinates:</p>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-white p-3 rounded border">
            <div>
              <span className="text-gray-500">Latitude:</span>
              <div className="font-bold text-gray-900">{selectedPosition[0].toFixed(6)}</div>
            </div>
            <div>
              <span className="text-gray-500">Longitude:</span>
              <div className="font-bold text-gray-900">{selectedPosition[1].toFixed(6)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Location marker component for modal map
function LocationMarkerModal({ onLocationSelect, position }) {
  const [selectedPosition, setSelectedPosition] = useState(position);
  
  useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setSelectedPosition(newPosition);
      if (onLocationSelect) {
        onLocationSelect(newPosition);
      }
    },
  });

  return selectedPosition ? (
    <Marker position={selectedPosition}>
      <Popup>
        <div className="text-center">
          <strong>📍 Selected Location</strong><br />
          <small>
            Lat: {selectedPosition[0].toFixed(6)}<br />
            Lng: {selectedPosition[1].toFixed(6)}
          </small><br />
          <em>Click anywhere on the map to change location</em>
        </div>
      </Popup>
    </Marker>
  ) : null;
}

function AdminDashboard() {
  // Add CSS for pulse animation
  useEffect(() => {
    if (!document.getElementById('live-marker-styles')) {
      const style = document.createElement('style');
      style.id = 'live-marker-styles';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deliveries, setDeliveries] = useState([]);
  const [warehouses, setWarehouses] = useState([]); 
  const [warehouseFreeSpace, setWarehouseFreeSpace] = useState([]);
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    location: '',
    capacityLimit: '',
    managerId: '',
    coordinates: { latitude: '', longitude: '' }
  });
  const [mapView, setMapView] = useState('users');
  
  // Delivery management states
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [transporterRequests, setTransporterRequests] = useState([]);
  const [availableTransporters, setAvailableTransporters] = useState([]);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedTransporterId, setSelectedTransporterId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [scheduledPickupTime, setScheduledPickupTime] = useState('');
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState('');
  // Temporary states for date/time selection with OK buttons
  const [tempPickupTime, setTempPickupTime] = useState('');
  const [tempDeliveryTime, setTempDeliveryTime] = useState('');
  const [deliveryActionLoading, setDeliveryActionLoading] = useState(null);
  const [warehouseDataLoading, setWarehouseDataLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [selectedTransporter, setSelectedTransporter] = useState('');
  const [pickupDate, setPickupDate] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedUserForLocation, setSelectedUserForLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    latitude: '',
    longitude: '',
    address: '',
    location: ''
  });
  const [usersWithLocations, setUsersWithLocations] = useState([]);
  const [locationFilter, setLocationFilter] = useState('all');
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    role: 'farmer',
  });
  
  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  
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
  
  // Profile picture states
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  
  // Location picker states
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const COLORS = ["#60A5FA", "#F59E0B", "#34D399", "#F472B6", "#A78BFA"];

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

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/summary");
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to load summary", err);
    }
  };
  
  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Notification fetch failed", err);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await api.get("/api/deliveries");
      setDeliveries(res.data);
    } catch (err) {
      console.error("Failed to load deliveries", err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get("/api/warehouses?manualOnly=true");
      setWarehouses(res.data);
    } catch (err) {
      console.error("Failed to load warehouses", err);
    }
  };

  // Get combined warehouse list including warehouse managers with coordinates
  const getCombinedWarehouses = () => {
    console.log('🔍 Debug - usersWithLocations:', usersWithLocations);
    console.log('🔍 Debug - warehouses:', warehouses);
    
    const warehouseManagersWithCoords = (usersWithLocations || [])
      .filter(user => user.role === 'warehouse_manager' && user.hasCoordinates && user.coordinates)
      .map(user => {
        console.log('🔍 Debug - Processing warehouse manager:', user.name, user.coordinates);
        return {
          _id: user._id,
          name: user.name,
          location: user.coordinates.address || user.location || 'No address',
          coordinates: {
            latitude: user.coordinates.latitude,
            longitude: user.coordinates.longitude
          },
          type: 'user', // To distinguish from Warehouse model
          user: user // Keep full user data
        };
      });

    const traditionalWarehouses = warehouses.map(warehouse => ({
      ...warehouse,
      type: 'warehouse' // To distinguish from User model
    }));

    console.log('🔍 Debug - warehouseManagersWithCoords:', warehouseManagersWithCoords);
    console.log('🔍 Debug - traditionalWarehouses:', traditionalWarehouses);
    
    const combined = [...traditionalWarehouses, ...warehouseManagersWithCoords];
    console.log('🔍 Debug - combined warehouses:', combined);
    
    return combined;
  };

  const fetchWarehouseFreeSpace = async () => {
    try {
      const res = await api.get("/api/warehouse/free-space");
      setWarehouseFreeSpace(res.data);
    } catch (err) {
      console.error("Failed to load warehouse free space", err);
    }
  };

  const cleanupTestWarehouses = async () => {
    if (!confirm('This will remove all auto-generated test warehouses. Only manually added warehouses will remain. Continue?')) {
      return;
    }

    try {
      const res = await api.delete("/api/warehouse/cleanup-test-data");
      alert(`Successfully cleaned up ${res.data.deletedCount} test warehouses`);
      // Refresh warehouse data
      fetchWarehouses();
      fetchWarehouseFreeSpace();
    } catch (err) {
      console.error("Failed to cleanup test warehouses", err);
      alert("Failed to cleanup test warehouses: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAddWarehouse = async () => {
    try {
      if (!newWarehouse.location || !newWarehouse.capacityLimit) {
        alert('Please fill in location and capacity limit');
        return;
      }

      const payload = {
        location: newWarehouse.location,
        capacityLimit: parseInt(newWarehouse.capacityLimit)
      };

      // Add managerId to payload if provided
      if (newWarehouse.managerId) {
        payload.managerId = newWarehouse.managerId;
      }

      if (newWarehouse.coordinates.latitude && newWarehouse.coordinates.longitude) {
        payload.coordinates = {
          latitude: parseFloat(newWarehouse.coordinates.latitude),
          longitude: parseFloat(newWarehouse.coordinates.longitude)
        };
      }

      await api.post("/api/warehouse/set-capacity", payload);
      alert('Warehouse added successfully!');
      
      // Reset form and refresh data
      setNewWarehouse({
        location: '',
        capacityLimit: '',
        managerId: '',
        coordinates: { latitude: '', longitude: '' }
      });
      setShowAddWarehouseModal(false);
      fetchWarehouses();
      fetchWarehouseFreeSpace();
    } catch (err) {
      console.error("Failed to add warehouse", err);
      alert("Failed to add warehouse: " + (err.response?.data?.message || err.message));
    }
  };

  // Delivery management functions
  const fetchPendingDeliveries = async () => {
    try {
      const res = await api.get("/api/delivery/admin/pending-deliveries");
      setPendingDeliveries(res.data || []);
    } catch (err) {
      console.error("Failed to load pending deliveries", err);
      setPendingDeliveries([]);
    }
  };

  const fetchAvailableTransporters = async () => {
    try {
      const res = await api.get("/api/delivery/admin/transporters");
      setAvailableTransporters(res.data || []);
    } catch (err) {
      console.error("Failed to load available transporters", err);
      // Fallback to all approved transporters
      const approvedTransporters = users.filter(u => u.role === 'transporter' && u.approved);
      setAvailableTransporters(approvedTransporters);
    }
  };

  const handleAcceptDelivery = async (deliveryId) => {
    if (!selectedTransporterId) {
      alert('Please select a transporter first');
      return;
    }

    try {
      setDeliveryActionLoading(deliveryId);
      
      const payload = {
        transporterId: selectedTransporterId,
        notes: actionReason
      };
      
      // Add scheduling information
      if (scheduledPickupTime) {
        payload.scheduledPickupTime = scheduledPickupTime;
      }
      
      if (scheduledDeliveryTime) {
        payload.scheduledDeliveryTime = scheduledDeliveryTime;
      }
      
      // Add warehouse location if selected
      if (selectedWarehouseId) {
        const selectedWarehouse = getCombinedWarehouses().find(w => w._id === selectedWarehouseId);
        if (selectedWarehouse) {
          payload.warehouseId = selectedWarehouseId;
          payload.dropoffLocation = selectedWarehouse.name;
          payload.dropoffCoordinates = selectedWarehouse.coordinates;
          
          // If it's a warehouse manager, add additional user info
          if (selectedWarehouse.type === 'user') {
            payload.warehouseManagerId = selectedWarehouse._id;
            payload.dropoffLocation = `${selectedWarehouse.name} (Warehouse Manager)`;
          }
        }
      }
      
      // Add farmer coordinates for pickup
      if (selectedDelivery.farmer?.coordinates) {
        payload.pickupCoordinates = selectedDelivery.farmer.coordinates;
      }
      
      await api.put(`/api/delivery/admin/accept-delivery/${deliveryId}`, payload);
      
      alert('Delivery request accepted and transporter assigned successfully!');
      fetchPendingDeliveries();
      setShowDeliveryModal(false);
      setSelectedDelivery(null);
      setSelectedTransporterId('');
      setSelectedWarehouseId('');
      setActionReason('');
      setScheduledPickupTime('');
      setScheduledDeliveryTime('');
      setScheduledPickupTime('');
      setScheduledDeliveryTime('');
    } catch (err) {
      console.error('Failed to accept delivery:', err);
      alert(err.response?.data?.message || 'Failed to accept delivery request');
    } finally {
      setDeliveryActionLoading(null);
    }
  };

  const handleRejectDelivery = async (deliveryId) => {
    try {
      setDeliveryActionLoading(deliveryId);
      await api.put(`/api/delivery/admin/reject-delivery/${deliveryId}`, {
        reason: actionReason
      });
      
      alert('Delivery request rejected successfully!');
      fetchPendingDeliveries();
      setShowDeliveryModal(false);
      setSelectedDelivery(null);
      setActionReason('');
    } catch (err) {
      console.error('Failed to reject delivery:', err);
      alert(err.response?.data?.message || 'Failed to reject delivery request');
    } finally {
      setDeliveryActionLoading(null);
    }
  };
  
  const markAllNotificationsRead = async () => {
    try {
      await axios.put("http://localhost:5000/api/notifications/mark-read", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  // Profile picture handlers
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    // Reset file input
    const fileInput = document.getElementById('profileImageInput');
    if (fileInput) fileInput.value = '';
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
      let updateData = {
        location: profileForm.location || user.location,
        phone: profileForm.phone || user.phone
      };
      
      // Add password fields if user wants to change password
      if (profileForm.newPassword) {
        updateData.currentPassword = profileForm.currentPassword;
        updateData.newPassword = profileForm.newPassword;
      }
      
      // Handle profile image upload first if there's a new image
      if (profileImageFile) {
        const formData = new FormData();
        formData.append('profilePhoto', profileImageFile);
        
        try {
          const uploadResponse = await axios.post('http://localhost:5000/api/auth/upload-profile-photo', formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });
          
          updateData.profilePhoto = uploadResponse.data.profilePhotoUrl;
        } catch (uploadError) {
          console.error('Failed to upload profile photo:', uploadError);
          setProfileError('Failed to upload profile photo. Updating other details...');
        }
      }
      
      const response = await axios.put('http://localhost:5000/api/auth/profile', updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local storage with new user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update user state for immediate UI update
      window.location.reload(); // This will refresh the page to reflect new profile photo
      
      // Reset form
      setProfileForm({
        location: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setProfileImageFile(null);
      setProfileImagePreview(null);
      
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
  
  // Location picker functions
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setSelectedCoordinates(coords);
          setMapCenter(coords);
          
          // Reverse geocode coordinates to get address
          reverseGeocode(coords);
        },
        (error) => {
          console.error('Error getting current location:', error);
          setIsGettingLocation(false);
          alert('Unable to get current location. Please select manually on the map.');
        }
      );
    } else {
      setIsGettingLocation(false);
      alert('Geolocation is not supported by this browser.');
    }
  };
  
  const reverseGeocode = async (coords) => {
    try {
      const [lat, lng] = coords;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        const locationString = data.display_name;
        setProfileForm(prev => ({ ...prev, location: locationString }));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };
  
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    const coords = [lat, lng];
    setSelectedCoordinates(coords);
    reverseGeocode(coords);
  };
  
  const selectLocationOnMap = () => {
    if (selectedCoordinates) {
      setShowLocationPicker(false);
    } else {
      alert('Please select a location on the map first.');
    }
  };

  // Handle authenticated export downloads
  const handleExport = async (endpoint) => {
    try {
      const response = await axios.get(`http://localhost:5000${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob', // Important for file downloads
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'export';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      } else {
        // Generate filename based on endpoint
        const pathParts = endpoint.split('/');
        const exportType = pathParts[pathParts.length - 1];
        const isPdf = endpoint.includes('/pdf');
        filename = `${exportType.replace('/pdf', '')}_${new Date().toISOString().split('T')[0]}.${isPdf ? 'pdf' : 'csv'}`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error.response?.data?.message || error.message || 'Please try again.'));
    }
  };

  useEffect(() => {
    document.title = "Admin Dashboard – AgriSync";
    if (user?.role !== "admin") {
      if (user?.role) {
        navigate(`/${user.role}/dashboard`);
      } else {
        navigate("/");
      }
      return;
    }
    fetchUsers();
    fetchSummary();
    fetchNotifications();
    if (activeTab === 'map') {
      fetchDeliveries();
      fetchWarehouses();
      fetchUsersWithLocations();
    }
    if (activeTab === 'deliveries') {
      fetchPendingDeliveries();
      fetchAvailableTransporters();
      fetchWarehouses();
      fetchWarehouseFreeSpace();
      fetchUsersWithLocations(); // Added to fix warehouse dropdown
    }
    if (activeTab === 'warehouses') {
      fetchWarehouses();
      fetchWarehouseFreeSpace();
    }
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [activeTab, users]);

  // Auto-refresh for live transporter locations when map is active and showing transporters
  useEffect(() => {
    let locationRefreshInterval;
    
    if (activeTab === 'map' && (locationFilter === 'all' || locationFilter === 'transporter')) {
      // Refresh locations every 30 seconds for live updates
      locationRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing transporter locations...');
        fetchUsersWithLocations();
      }, 30000);
    }
    
    return () => {
      if (locationRefreshInterval) {
        clearInterval(locationRefreshInterval);
      }
    };
  }, [activeTab, locationFilter]);

  const switchRole = (newRole) => {
    if (newRole) {
      navigate(`/${newRole}/dashboard`);
    } else {
      navigate("/");
    }
  };

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  // Handle user approval/decline
  const handleUserApproval = async (userId, approve) => {
    try {
      setLoadingAction(userId);
      
      if (approve) {
        await axios.put(`http://localhost:5000/api/auth/users/${userId}/approve`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.delete(`http://localhost:5000/api/auth/users/${userId}/decline`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Refresh users list
      fetchUsers();
    } catch (err) {
      console.error('Error updating user approval:', err);
      alert(err.response?.data?.message || 'Error updating user approval');
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoadingAction(userId);
      
      await axios.delete(`http://localhost:5000/api/auth/users/${userId}/decline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh users list
      fetchUsers();
      alert(`User "${userName}" has been deleted successfully.`);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(err.response?.data?.message || 'Error deleting user');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
        alert('Please fill in all required fields');
        return;
      }

      const userData = {
        name: `${newUser.firstName} ${newUser.lastName}`.trim(),
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone,
        location: newUser.location,
        role: newUser.role
      };

      const endpoint = newUser.role === 'admin' ? '/api/auth/create-admin' : '/api/auth/register';
      await axios.post(`http://localhost:5000${endpoint}`, userData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      alert(`${newUser.role} user created successfully!`);
      fetchUsers();
      setShowCreateUserModal(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        location: '',
        role: 'farmer',
      });
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Error creating user: ' + (err.response?.data?.message || 'Please try again.'));
    }
  };

  // Location Management Functions
  const fetchUsersWithLocations = async () => {
    try {
      const roleParam = locationFilter !== 'all' ? `?role=${locationFilter}` : '';
      const res = await axios.get(`http://localhost:5000/api/auth/users/locations${roleParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsersWithLocations(res.data.users);
    } catch (err) {
      console.error("Failed to load users with locations", err);
    }
  };

  const handleSetLocation = (user) => {
    setSelectedUserForLocation(user);
    setLocationForm({
      latitude: user.coordinates?.latitude || '',
      longitude: user.coordinates?.longitude || '',
      address: user.coordinates?.address || '',
      location: user.location || ''
    });
    setShowLocationModal(true);
  };

  const handleUpdateLocation = async () => {
    try {
      if (!locationForm.latitude || !locationForm.longitude) {
        alert('Please enter both latitude and longitude');
        return;
      }

      console.log('Updating location for user:', selectedUserForLocation);
      console.log('Location data:', {
        latitude: parseFloat(locationForm.latitude),
        longitude: parseFloat(locationForm.longitude),
        address: locationForm.address,
        location: locationForm.location
      });

      // Use the correct ID field - check both _id and id
      const userId = selectedUserForLocation._id || selectedUserForLocation.id;
      console.log('Using user ID:', userId);

      if (!userId) {
        console.error('User ID is missing from selectedUserForLocation:', selectedUserForLocation);
        alert('Error: User ID not found. Please try refreshing the page.');
        return;
      }

      const response = await axios.put(`http://localhost:5000/api/auth/users/${userId}/location`, {
        latitude: parseFloat(locationForm.latitude),
        longitude: parseFloat(locationForm.longitude),
        address: locationForm.address,
        location: locationForm.location
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Location update response:', response.data);
      alert(`Location updated successfully for ${selectedUserForLocation.name}`);
      setShowLocationModal(false);
      fetchUsersWithLocations();
      fetchUsers(); // Refresh main users list too
    } catch (err) {
      console.error('Full error object:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      alert('Error updating location: ' + (err.response?.data?.message || err.message || 'Please try again.'));
    }
  };

  const handleRemoveLocation = async (user) => {
    if (!window.confirm(`Are you sure you want to remove the location for ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Removing location for user:', user);

      // Use the correct ID field - check both _id and id
      const userId = user._id || user.id;
      console.log('Using user ID:', userId);

      if (!userId) {
        console.error('User ID is missing from user:', user);
        alert('Error: User ID not found. Please try refreshing the page.');
        return;
      }

      const response = await axios.put(`http://localhost:5000/api/auth/users/${userId}/location`, {
        latitude: null,
        longitude: null,
        address: '',
        location: ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Location removal response:', response.data);
      alert(`Location removed successfully for ${user.name}`);
      fetchUsersWithLocations();
      fetchUsers(); // Refresh main users list too
    } catch (err) {
      console.error('Full error object:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      alert('Error removing location: ' + (err.response?.data?.message || err.message || 'Please try again.'));
    }
  };

  // Load users with locations when location tab is active
  useEffect(() => {
    if (activeTab === 'locations') {
      fetchUsersWithLocations();
    }
  }, [activeTab, locationFilter]);

  // Filter users based on search term and selected role
  const filteredUsers = (users || []).filter(Boolean).filter(user => 
    user && user.name && user.email && user.role &&
    (selectedRole === '' || user.role === selectedRole) &&
    (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Filter users for location management
  const filteredLocationUsers = (usersWithLocations || []).filter(Boolean).filter(user => 
    user && user.name && user.email &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen p-3 md:p-6 bg-gray-50">
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        
        {/* Responsive Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
          <div className="grid grid-cols-2 sm:flex gap-1 sm:gap-2">
            <button className={`px-3 py-2 text-sm rounded ${activeTab === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`} 
              onClick={() => setActiveTab('dashboard')}>Dashboard</button>
            <button className={`px-3 py-2 text-sm rounded ${activeTab === 'deliveries' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`} 
              onClick={() => setActiveTab('deliveries')}>Deliveries</button>
            <button className={`px-3 py-2 text-sm rounded ${activeTab === 'warehouses' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`} 
              onClick={() => setActiveTab('warehouses')}>Warehouses</button>
            <button className={`px-3 py-2 text-sm rounded ${activeTab === 'locations' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`} 
              onClick={() => setActiveTab('locations')}>Locations</button>
            <button className={`px-3 py-2 text-sm rounded ${activeTab === 'map' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`} 
              onClick={() => setActiveTab('map')}>Map View</button>
          </div>
          
          {/* Role Filter Buttons - Show for map and locations tabs */}
          {(activeTab === 'map' || activeTab === 'locations') && (
            <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded ${locationFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setLocationFilter('all')}
              >
                All
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded flex items-center gap-1 ${locationFilter === 'farmer' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setLocationFilter('farmer')}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="hidden sm:inline">Farmers</span>
                <span className="sm:hidden">Farm</span>
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded flex items-center gap-1 ${locationFilter === 'warehouse_manager' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setLocationFilter('warehouse_manager')}
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="hidden sm:inline">Warehouses</span>
                <span className="sm:hidden">WH</span>
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded flex items-center gap-1 ${locationFilter === 'market_vendor' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setLocationFilter('market_vendor')}
              >
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="hidden sm:inline">Vendors</span>
                <span className="sm:hidden">Vend</span>
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded flex items-center gap-1 ${locationFilter === 'transporter' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setLocationFilter('transporter')}
              >
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="hidden sm:inline">Transporters</span>
                <span className="sm:hidden">Trans</span>
              </button>
            </div>
          )}
          
          {/* Role Filter for Dashboard tab */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded ${selectedRole === '' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedRole('')}
              >
                All Roles
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded ${selectedRole === 'admin' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedRole('admin')}
              >
                Admin
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded ${selectedRole === 'farmer' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedRole('farmer')}
              >
                Farmer
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded ${selectedRole === 'warehouse_manager' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedRole('warehouse_manager')}
              >
                <span className="hidden sm:inline">Warehouse</span>
                <span className="sm:hidden">WH</span>
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded ${selectedRole === 'transporter' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedRole('transporter')}
              >
                <span className="hidden sm:inline">Transporter</span>
                <span className="sm:hidden">Trans</span>
              </button>
              <button
                className={`px-2 py-1 text-xs sm:text-sm rounded ${selectedRole === 'market_vendor' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedRole('market_vendor')}
              >
                <span className="hidden sm:inline">Vendor</span>
                <span className="sm:hidden">Vend</span>
              </button>
            </div>
          )}
          
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-auto border px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            className="text-gray-800 font-medium relative whitespace-nowrap"
            onClick={() => setShowNotifModal(true)}
          >
            <span className="hidden sm:inline">🔔 Notifications</span>
            <span className="sm:hidden">🔔</span>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="bg-white p-4 rounded-xl shadow mb-6">
            <h2 className="text-xl font-semibold mb-2">System Summary</h2>
            {summary ? (
              <ul className="text-sm space-y-1">
                <li>Total Users: {users.length}</li>
                <li>Total Farmers: {roleCounts.farmer || 0}</li>
                <li>Total Warehouse Managers: {roleCounts.warehouse_manager || 0}</li>
                <li>Total Transporters: {roleCounts.transporter || 0}</li>
                <li>Total Vendors: {roleCounts.market_vendor || 0}</li>
                <li>Total Deliveries: {summary.deliveries}</li>
                <li>Total Orders: {summary.orders}</li>
                <li>Total Inventory Items: {summary.inventory}</li>
              </ul>
            ) : (
              <p className="text-gray-500">Loading summary...</p>
            )}
          </div>

          {/* Role Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-4">User Distribution by Role</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(roleCounts).map(([role, count]) => ({
                      name: role.replace("_", " ").toUpperCase(),
                      value: count,
                      fill: COLORS[Object.keys(roleCounts).indexOf(role) % COLORS.length]
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(roleCounts).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold mb-4">System Statistics</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Users', value: users.length },
                  { name: 'Deliveries', value: summary?.deliveries || 0 },
                  { name: 'Orders', value: summary?.orders || 0 },
                  { name: 'Inventory', value: summary?.inventory || 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}


      {activeTab === 'map' && (
        <div className="mb-6">
          {/* Map Controls */}
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">User Locations Map</h3>
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => {
                    fetchUsersWithLocations();
                    fetchUsers();
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Locations
                </button>
              </div>
            </div>
            
            {/* Map Legend with Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div className="flex items-center gap-2 bg-green-50 p-2 rounded">
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
                <div>
                  <span className="text-sm font-medium">Farmers</span>
                  <div className="text-xs text-gray-600">
                    {usersWithLocations.filter(u => u.role === 'farmer' && u.hasCoordinates).length} located / {usersWithLocations.filter(u => u.role === 'farmer').length} total
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-yellow-50 p-2 rounded">
                <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow"></div>
                <div>
                  <span className="text-sm font-medium">Transporters</span>
                  <div className="text-xs text-gray-600">
                    {usersWithLocations.filter(u => u.role === 'transporter' && u.hasCoordinates).length} located / {usersWithLocations.filter(u => u.role === 'transporter').length} total
                    {usersWithLocations.filter(u => u.role === 'transporter' && u.isLive).length > 0 && (
                      <div className="text-green-600 font-medium">
                        🔴 {usersWithLocations.filter(u => u.role === 'transporter' && u.isLive).length} live
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded">
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow"></div>
                <div>
                  <span className="text-sm font-medium">Warehouses</span>
                  <div className="text-xs text-gray-600">
                    {usersWithLocations.filter(u => u.role === 'warehouse_manager' && u.hasCoordinates).length} located / {usersWithLocations.filter(u => u.role === 'warehouse_manager').length} total
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-purple-50 p-2 rounded">
                <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow"></div>
                <div>
                  <span className="text-sm font-medium">Vendors</span>
                  <div className="text-xs text-gray-600">
                    {usersWithLocations.filter(u => u.role === 'market_vendor' && u.hasCoordinates).length} located / {usersWithLocations.filter(u => u.role === 'market_vendor').length} total
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-red-50 p-2 rounded">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
                <div>
                  <span className="text-sm font-medium">Admins</span>
                  <div className="text-xs text-gray-600">
                    {usersWithLocations.filter(u => u.role === 'admin' && u.hasCoordinates).length} located / {usersWithLocations.filter(u => u.role === 'admin').length} total
                  </div>
                </div>
              </div>
            </div>
            
            {/* Summary Statistics */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span>Total Users: <strong>{usersWithLocations.length}</strong></span>
                <span>Located Users: <strong>{usersWithLocations.filter(u => u.hasCoordinates).length}</strong></span>
                <span>Missing Locations: <strong>{usersWithLocations.filter(u => !u.hasCoordinates).length}</strong></span>
                <span className="text-green-600">Coverage: <strong>{usersWithLocations.length > 0 ? ((usersWithLocations.filter(u => u.hasCoordinates).length / usersWithLocations.length) * 100).toFixed(1) : 0}%</strong></span>
              </div>
            </div>
          </div>
          
          <MapContainer center={[27.705545, 85.333525]} zoom={10} style={{ height: "70vh", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
            />
            
            {/* Display users from usersWithLocations with coordinates */}
            {usersWithLocations
              .filter(user => {
                // Apply role filter
                if (locationFilter !== 'all' && user.role !== locationFilter) return false;
                // Only show users with coordinates
                return user.coordinates && user.coordinates.latitude && user.coordinates.longitude;
              })
              .map(user => {
                const lat = user.coordinates.latitude;
                const lng = user.coordinates.longitude;
                let icon, popupContent;
                
                switch(user.role) {
                  case 'farmer':
                    icon = farmerIcon;
                    popupContent = (
                      <div>
                        <h4 className="font-semibold text-green-700 mb-2">🌾 Farmer</h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Name:</strong> {user.name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                          <p><strong>Location:</strong> {user.location || 'Not specified'}</p>
                          <p><strong>Address:</strong> {user.coordinates.address || 'Not specified'}</p>
                          <p><strong>Status:</strong> 
                            <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                              user.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.approved ? 'Approved' : 'Pending'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                          </p>
                          {user.coordinates.lastUpdated && (
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(user.coordinates.lastUpdated).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 space-x-2">
                          <button 
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            onClick={() => handleSetLocation(user)}
                          >
                            Update Location
                          </button>
                        </div>
                      </div>
                    );
                    break;
                  case 'transporter':
                    icon = user.isLive ? liveTransporterIcon : transporterIcon;
                    popupContent = (
                      <div>
                        <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                          🚛 Transporter
                          {user.isLive && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              LIVE
                            </span>
                          )}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Name:</strong> {user.name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                          <p><strong>Location:</strong> {user.location || 'Not specified'}</p>
                          <p><strong>Address:</strong> {user.coordinates.address || 'Not specified'}</p>
                          <p><strong>Status:</strong> 
                            <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                              user.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.approved ? 'Approved' : 'Pending'}
                            </span>
                          </p>
                          {user.isLive && (
                            <p className="text-xs">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                                🚚 In Transit - Live Tracking Active
                              </span>
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                          </p>
                          {user.coordinates.lastUpdated && (
                            <p className="text-xs text-gray-500">
                              {user.isLive ? 'Last Update' : 'Updated'}: {new Date(user.coordinates.lastUpdated).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 space-x-2">
                          <button 
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            onClick={() => handleSetLocation(user)}
                          >
                            Update Location
                          </button>
                          {user.isLive && (
                            <span className="text-xs text-green-600 font-medium">
                              ⚡ Auto-updating from delivery
                            </span>
                          )}
                        </div>
                      </div>
                    );
                    break;
                  case 'warehouse_manager':
                    icon = warehouseIcon;
                    popupContent = (
                      <div>
                        <h4 className="font-semibold text-blue-700 mb-2">🏪 Warehouse Manager</h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Name:</strong> {user.name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                          <p><strong>Warehouse:</strong> {user.location || 'Not specified'}</p>
                          <p><strong>Address:</strong> {user.coordinates.address || 'Not specified'}</p>
                          <p><strong>Status:</strong> 
                            <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                              user.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.approved ? 'Approved' : 'Pending'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                          </p>
                          {user.coordinates.lastUpdated && (
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(user.coordinates.lastUpdated).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 space-x-2">
                          <button 
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            onClick={() => handleSetLocation(user)}
                          >
                            Update Location
                          </button>
                        </div>
                      </div>
                    );
                    break;
                  case 'market_vendor':
                    icon = vendorIcon;
                    popupContent = (
                      <div>
                        <h4 className="font-semibold text-purple-700 mb-2">🏪 Market Vendor</h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Name:</strong> {user.name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                          <p><strong>Market:</strong> {user.location || 'Not specified'}</p>
                          <p><strong>Address:</strong> {user.coordinates.address || 'Not specified'}</p>
                          <p><strong>Status:</strong> 
                            <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                              user.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.approved ? 'Approved' : 'Pending'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                          </p>
                          {user.coordinates.lastUpdated && (
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(user.coordinates.lastUpdated).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 space-x-2">
                          <button 
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            onClick={() => handleSetLocation(user)}
                          >
                            Update Location
                          </button>
                        </div>
                      </div>
                    );
                    break;
                  case 'admin':
                    icon = adminIcon;
                    popupContent = (
                      <div>
                        <h4 className="font-semibold text-red-700 mb-2">👤 Admin</h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Name:</strong> {user.name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                          <p><strong>Location:</strong> {user.location || 'Not specified'}</p>
                          <p><strong>Address:</strong> {user.coordinates.address || 'Not specified'}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                          </p>
                          {user.coordinates.lastUpdated && (
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(user.coordinates.lastUpdated).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 space-x-2">
                          <button 
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                            onClick={() => handleSetLocation(user)}
                          >
                            Update Location
                          </button>
                        </div>
                      </div>
                    );
                    break;
                  default:
                    return null;
                }
                
                return (
                  <Marker key={`user-${user.id}`} position={[lat, lng]} icon={icon}>
                    <Popup maxWidth={300}>{popupContent}</Popup>
                  </Marker>
                );
              })}
          </MapContainer>
          
          {/* Users without locations warning */}
          {(usersWithLocations || []).filter(Boolean).filter(u => u && !u.hasCoordinates).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-yellow-800 mb-1">Users Missing Location Data</h4>
                  <p className="text-sm text-yellow-700 mb-2">
                    {(usersWithLocations || []).filter(Boolean).filter(u => u && !u.hasCoordinates).length} users don't have coordinates set. 
                    Go to Location Management tab to set their locations.
                  </p>
                  <div className="text-xs text-yellow-600">
                    Missing locations: {(usersWithLocations || []).filter(Boolean).filter(u => u && !u.hasCoordinates && u.name).map(u => u.name).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivery Requests Tab */}
      {activeTab === 'deliveries' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow">
              <div className="text-2xl font-bold">{pendingDeliveries.length}</div>
              <div className="text-sm opacity-80">Pending Requests</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow">
              <div className="text-2xl font-bold">{availableTransporters.length}</div>
              <div className="text-sm opacity-80">Available Transporters</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow">
              <div className="text-2xl font-bold">{users.filter(u => u.role === 'transporter' && u.approved).length}</div>
              <div className="text-sm opacity-80">Total Transporters</div>
            </div>
          </div>

          {/* Pending Delivery Requests */}
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Pending Delivery Requests</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    fetchPendingDeliveries();
                    fetchAvailableTransporters();
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {pendingDeliveries.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Delivery Requests</h3>
                <p className="text-gray-500">All delivery requests have been processed or there are no new requests at this time.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Requester</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Product Details</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Pickup Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Requested Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDeliveries.map((delivery) => (
                      <tr key={delivery._id || delivery.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {delivery.farmer?.name || delivery.vendor?.name || delivery.farmerName || 'Unknown Requester'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {delivery.farmer?.email || delivery.vendor?.email || delivery.farmerEmail || ''}
                            </div>
                            <div className="text-xs text-gray-400">
                              {delivery.requesterType ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  delivery.requesterType === 'farmer' ? 'bg-green-100 text-green-700' :
                                  delivery.requesterType === 'market_vendor' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {delivery.requesterType === 'market_vendor' ? '🏪 Vendor' : '🌾 Farmer'}
                                </span>
                              ) : (
                                delivery.farmer ? '🌾 Farmer' : delivery.vendor ? '🏪 Vendor' : 'Unknown'
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {delivery.goodsDescription || delivery.productName || delivery.product || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Qty: {delivery.quantity || 'N/A'} {delivery.unit || ''}
                            </div>
                            {delivery.description && (
                              <div className="text-xs text-gray-400 mt-1">
                                {delivery.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {delivery.pickupLocation || delivery.location || 'Not specified'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {delivery.requestedDate 
                            ? new Date(delivery.requestedDate).toLocaleDateString()
                            : delivery.createdAt 
                              ? new Date(delivery.createdAt).toLocaleDateString()
                              : 'N/A'
                          }
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            delivery.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                            delivery.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                            delivery.urgency === 'low' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {(delivery.urgency || 'normal').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={async () => {
                                setSelectedDelivery(delivery);
                                setWarehouseDataLoading(true);
                                // Ensure all warehouse data is loaded before opening modal
                                console.log('🔍 Debug - Opening delivery modal, fetching warehouse data...');
                                try {
                                  await Promise.all([
                                    fetchWarehouses(),
                                    fetchWarehouseFreeSpace(),
                                    fetchUsersWithLocations()
                                  ]);
                                  console.log('🔍 Debug - All warehouse data fetched, opening modal');
                                  setShowDeliveryModal(true);
                                } catch (error) {
                                  console.error('🔍 Debug - Error fetching warehouse data:', error);
                                } finally {
                                  setWarehouseDataLoading(false);
                                }
                              }}
                              disabled={warehouseDataLoading}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                            >
                              {warehouseDataLoading ? 'Loading...' : 'Manage'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Available Transporters */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-4">Available Transporters</h2>
            {availableTransporters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No available transporters at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTransporters.map((transporter) => (
                  <div key={transporter._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                        {transporter.profilePhoto ? (
                          <img 
                            src={transporter.profilePhoto} 
                            alt={transporter.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                            {(transporter.name || '').split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{transporter.name}</div>
                        <div className="text-xs text-gray-500">{transporter.email}</div>
                        {transporter.phone && (
                          <div className="text-xs text-gray-500">{transporter.phone}</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-gray-600">
                        Location: {transporter.location || 'Not specified'}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Available
                        </span>
                        <span className="text-xs text-gray-500">
                          ID: {transporter._id?.slice(-6) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow">
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-sm opacity-80">Total Users</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow">
              <div className="text-2xl font-bold">{summary?.deliveries || 0}</div>
              <div className="text-sm opacity-80">Deliveries</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow">
              <div className="text-2xl font-bold">{summary?.orders || 0}</div>
              <div className="text-sm opacity-80">Orders</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-xl shadow">
              <div className="text-2xl font-bold">{summary?.inventory || 0}</div>
              <div className="text-sm opacity-80">Inventory Items</div>
            </div>
          </div>

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Date Range Export</h2>
        <div className="flex gap-4 mb-4">
          <DatePicker selected={from} onChange={setFrom} placeholderText="From date" className="border px-2 py-1 rounded" />
          <DatePicker selected={to} onChange={setTo} placeholderText="To date" className="border px-2 py-1 rounded" />
        </div>
        <div className="space-y-6">
          {/* System-wide Exports */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">📊 System Reports</h4>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleExport(buildUrl("/api/export/inventory"))}
                className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                All Inventory (CSV)
              </button>
              <button 
                onClick={() => handleExport(buildUrl("/api/export/inventory/pdf"))}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                All Inventory (PDF)
              </button>
              <button 
                onClick={() => handleExport(buildUrl("/api/export/deliveries"))}
                className="bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                </svg>
                All Deliveries (CSV)
              </button>
              <button 
                onClick={() => handleExport(buildUrl("/api/export/orders"))}
                className="bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" />
                </svg>
                All Orders (CSV)
              </button>
              <button 
                onClick={() => handleExport("/api/export/warehouse-summary")}
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Warehouses (CSV)
              </button>
            </div>
          </div>

          {/* Role-specific Exports */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">👥 Role-Specific Reports</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Farmer Exports */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-sm">🌾</span>
                  </div>
                  <h5 className="text-sm font-semibold text-green-800">Farmer Reports</h5>
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/farmer/deliveries?format=csv"))}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Farmer Deliveries (CSV)
                  </button>
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/farmer/deliveries?format=pdf"))}
                    className="w-full bg-green-700 text-white px-3 py-2 rounded text-sm hover:bg-green-800 transition-colors"
                  >
                    Farmer Deliveries (PDF)
                  </button>
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/farmer/inventory?format=csv"))}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Farmer Inventory (CSV)
                  </button>
                </div>
              </div>

              {/* Transporter Exports */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-sm">🚛</span>
                  </div>
                  <h5 className="text-sm font-semibold text-yellow-800">Transporter Reports</h5>
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/transporter/deliveries?format=csv"))}
                    className="w-full bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 transition-colors"
                  >
                    Transport Deliveries (CSV)
                  </button>
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/transporter/deliveries?format=pdf"))}
                    className="w-full bg-yellow-700 text-white px-3 py-2 rounded text-sm hover:bg-yellow-800 transition-colors"
                  >
                    Transport Deliveries (PDF)
                  </button>
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/transporter/summary?format=csv"))}
                    className="w-full bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 transition-colors"
                  >
                    Transporter Summary (CSV)
                  </button>
                </div>
              </div>

              {/* Warehouse Manager Exports */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-sm">🏪</span>
                  </div>
                  <h5 className="text-sm font-semibold text-blue-800">Warehouse Reports</h5>
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/warehouse/inventory?format=csv"))}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Warehouse Inventory (CSV)
                  </button>
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/warehouse/inventory?format=pdf"))}
                    className="w-full bg-blue-700 text-white px-3 py-2 rounded text-sm hover:bg-blue-800 transition-colors"
                  >
                    Warehouse Inventory (PDF)
                  </button>
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/warehouse/summary?format=csv"))}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Warehouse Summary (CSV)
                  </button>
                </div>
              </div>

              {/* Market Vendor Exports */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-sm">🏪</span>
                  </div>
                  <h5 className="text-sm font-semibold text-purple-800">Market Vendor Reports</h5>
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/vendor/orders?format=csv"))}
                    className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
                  >
                    Vendor Orders (CSV)
                  </button>
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/vendor/orders?format=pdf"))}
                    className="w-full bg-purple-700 text-white px-3 py-2 rounded text-sm hover:bg-purple-800 transition-colors"
                  >
                    Vendor Orders (PDF)
                  </button>
                  <button 
                    onClick={() => handleExport(buildUrl("/api/export/vendor/summary?format=csv"))}
                    className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
                  >
                    Vendor Summary (CSV)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Users ({filteredUsers.length})</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowCreateUserModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Create User
            </button>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm ? `No users found matching "${searchTerm}"` : "No users found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                          {u.profilePhoto ? (
                            <img 
                              src={u.profilePhoto} 
                              alt={u.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-xs">
                              {(u.name || '').split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500">{u.location || 'No location set'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        u.role === 'admin' ? 'bg-red-100 text-red-800' :
                        u.role === 'farmer' ? 'bg-green-100 text-green-800' :
                        u.role === 'warehouse_manager' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'transporter' ? 'bg-yellow-100 text-yellow-800' :
                        u.role === 'market_vendor' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        u.approved ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {u.role === 'admin' ? 'AUTO-APPROVED' : u.approved ? 'APPROVED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedUser(u);
                            setShowUserModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                        {u.role !== 'admin' && !u.approved && (
                          <>
                            <button
                              onClick={() => handleUserApproval(u._id, true)}
                              disabled={loadingAction === u._id}
                              className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                            >
                              {loadingAction === u._id ? 'Loading...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleUserApproval(u._id, false)}
                              disabled={loadingAction === u._id}
                              className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                            >
                              {loadingAction === u._id ? 'Loading...' : 'Decline'}
                            </button>
                          </>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            disabled={loadingAction === u._id}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          >
                            {loadingAction === u._id ? 'Loading...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      <Modal isOpen={showNotifModal} onClose={() => setShowNotifModal(false)}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
            <button
              onClick={async () => {
                await axios.put("http://localhost:5000/api/notifications/mark-read", {}, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setShowNotifModal(false);
                fetchNotifications();
              }}
              className="text-sm text-gray-600 underline hover:text-gray-800"
            >
              Mark All as Read
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {(notifications || []).filter(Boolean).map((note) => (
                <li
                  key={note._id}
                  className={`p-3 rounded border ${
                    note.read ? "bg-gray-50 text-gray-600" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div>{note.message || 'No message content'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Unknown date'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* User Details Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)}>
        {selectedUser && (
          <div className="space-y-4">
            <div className="sticky top-0 bg-white pb-3 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                User Profile - {selectedUser.name}
              </h2>
            </div>
            <div className="max-h-[70vh] overflow-y-auto space-y-4">
              {/* User Profile Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg">
                    {selectedUser.profilePhoto ? (
                      <img 
                        src={selectedUser.profilePhoto} 
                        alt={selectedUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                        {(selectedUser.name || '').split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      selectedUser.role === 'admin' ? 'bg-red-100 text-red-800' :
                      selectedUser.role === 'farmer' ? 'bg-green-100 text-green-800' :
                      selectedUser.role === 'warehouse_manager' ? 'bg-blue-100 text-blue-800' :
                      selectedUser.role === 'transporter' ? 'bg-yellow-100 text-yellow-800' :
                      selectedUser.role === 'market_vendor' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedUser.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600 font-medium">Full Name:</label>
                    <p className="text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 font-medium">Email Address:</label>
                    <p className="text-gray-900 break-words">{selectedUser.email}</p>
                  </div>
                  {selectedUser.phone && (
                    <div>
                      <label className="text-gray-600 font-medium">Phone Number:</label>
                      <p className="text-gray-900">{selectedUser.phone}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-gray-600 font-medium">User Role:</label>
                    <p className="text-gray-900">{selectedUser.role.replace('_', ' ').charAt(0).toUpperCase() + selectedUser.role.replace('_', ' ').slice(1)}</p>
                  </div>
                  {selectedUser.location && (
                    <div className="md:col-span-2">
                      <label className="text-gray-600 font-medium">Location:</label>
                      <p className="text-gray-900">{selectedUser.location}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Status */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Account Status
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600 font-medium">Approval Status:</label>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        selectedUser.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        selectedUser.approved ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedUser.role === 'admin' ? 'AUTO-APPROVED' : selectedUser.approved ? 'APPROVED' : 'PENDING APPROVAL'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-600 font-medium">Account Created:</label>
                    <p className="text-gray-900">
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                  {selectedUser.updatedAt && (
                    <div>
                      <label className="text-gray-600 font-medium">Last Updated:</label>
                      <p className="text-gray-900">
                        {new Date(selectedUser.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Information */}
              {(selectedUser.coordinates || selectedUser.location) && (
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    {selectedUser.location && (
                      <div>
                        <label className="text-gray-600 font-medium">Location Name:</label>
                        <p className="text-gray-900">{selectedUser.location}</p>
                      </div>
                    )}
                    {selectedUser.coordinates && (
                      <>
                        {selectedUser.coordinates.address && (
                          <div>
                            <label className="text-gray-600 font-medium">Address:</label>
                            <p className="text-gray-900">{selectedUser.coordinates.address}</p>
                          </div>
                        )}
                        {selectedUser.coordinates.latitude && selectedUser.coordinates.longitude && (
                          <div>
                            <label className="text-gray-600 font-medium">Coordinates:</label>
                            <div className="bg-gray-50 p-2 rounded border font-mono text-xs mt-1">
                              <div>Latitude: {selectedUser.coordinates.latitude.toFixed(6)}</div>
                              <div>Longitude: {selectedUser.coordinates.longitude.toFixed(6)}</div>
                            </div>
                          </div>
                        )}
                        {selectedUser.coordinates.lastUpdated && (
                          <div>
                            <label className="text-gray-600 font-medium">Location Last Updated:</label>
                            <p className="text-gray-900">
                              {new Date(selectedUser.coordinates.lastUpdated).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* System Information */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  System Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <label className="text-gray-600 font-medium">User ID:</label>
                    <p className="text-gray-700 font-mono text-xs bg-gray-50 p-1 rounded border break-all">{selectedUser._id}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 font-medium">Account Type:</label>
                    <p className="text-gray-900">{selectedUser.role === 'admin' ? 'Administrator Account' : 'Standard User Account'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setShowUserModal(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transporter Assignment Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)}>
        {selectedFarmer && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Assign Transporter</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div>
              <p><strong>Farmer:</strong> {selectedFarmer.name}</p>
              <p><strong>Location:</strong> {selectedFarmer.location.address || 'N/A'}</p>
            </div>
            <select
              value={selectedTransporter}
              onChange={(e) => setSelectedTransporter(e.target.value)}
              className="border-gray-300 rounded w-full"
            >
              <option value="">Select Transporter</option>
              {users.filter(u => u.role === 'transporter').map(transporter => (
                <option key={transporter._id} value={transporter._id}>
                  {transporter.name}
                </option>
              ))}
            </select>
            <DatePicker
              selected={pickupDate}
              onChange={setPickupDate}
              placeholderText="Select pickup date"
              className="border px-2 py-1 rounded w-full"
            />
            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  if (selectedTransporter) {
                    setAssignments([...assignments, {
                      farmerId: selectedFarmer._id,
                      transporterId: selectedTransporter,
                      pickupDate
                    }]);
                    setShowAssignModal(false);
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Warehouse Management Tab */}
      {activeTab === 'warehouses' && (
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Warehouse Capacity Management</h2>
            <div className="flex gap-3 items-center">
              <button
                onClick={() => setShowAddWarehouseModal(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Warehouse
              </button>
              <button
                onClick={cleanupTestWarehouses}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clean Test Data
              </button>
              <button
                onClick={() => {
                  fetchWarehouses();
                  fetchWarehouseFreeSpace();
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-600 text-sm">
              Monitor warehouse capacity utilization across all locations. View current stock levels, free space, and capacity limits to optimize delivery assignments.
            </p>
          </div>

          {/* Warehouse Capacity Overview Cards */}
          {warehouseFreeSpace.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {warehouseFreeSpace.map((warehouse) => {
                const usagePercent = ((warehouse.currentStock / warehouse.capacityLimit) * 100).toFixed(1);
                const isOverCapacity = warehouse.freeSpace < 0;
                const isNearCapacity = warehouse.freeSpace < warehouse.capacityLimit * 0.1;
                
                return (
                  <div 
                    key={warehouse.location} 
                    className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                      isOverCapacity ? 'border-red-300 bg-red-50' :
                      isNearCapacity ? 'border-yellow-300 bg-yellow-50' :
                      'border-green-300 bg-green-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-sm truncate">{warehouse.location}</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {warehouse.currentStock} / {warehouse.capacityLimit} units
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isOverCapacity ? 'bg-red-200 text-red-800' :
                        isNearCapacity ? 'bg-yellow-200 text-yellow-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {usagePercent}%
                      </div>
                    </div>
                    
                    {/* Capacity Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Capacity Usage</span>
                        <span>{warehouse.currentStock} units</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isOverCapacity ? 'bg-red-500' :
                            isNearCapacity ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, parseFloat(usagePercent))}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Free Space Info */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-gray-600">Free Space:</span>
                        <span className={`ml-1 text-xs font-medium ${
                          isOverCapacity ? 'text-red-600' :
                          isNearCapacity ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {warehouse.freeSpace >= 0 ? 
                            `${warehouse.freeSpace} units` : 
                            `Over by ${Math.abs(warehouse.freeSpace)}`
                          }
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        isOverCapacity ? 'bg-red-100 text-red-700' :
                        isNearCapacity ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {isOverCapacity ? '🚨 Over' :
                         isNearCapacity ? '⚡ Near' :
                         '✅ Good'
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg mb-6">
              <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No warehouse capacity data available</p>
              <p className="text-xs text-gray-400 mt-1">Click "Refresh Data" to load warehouse information</p>
            </div>
          )}

          {/* Detailed Warehouse Table */}
          {warehouseFreeSpace.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-800">Detailed Warehouse Information</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Warehouse Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity Limit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage %
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Free Space
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {warehouseFreeSpace
                      .sort((a, b) => {
                        // Sort: Over capacity first, then near capacity, then by usage percentage
                        const aOverCapacity = a.freeSpace < 0;
                        const bOverCapacity = b.freeSpace < 0;
                        const aNearCapacity = a.freeSpace < a.capacityLimit * 0.1;
                        const bNearCapacity = b.freeSpace < b.capacityLimit * 0.1;
                        
                        if (aOverCapacity && !bOverCapacity) return -1;
                        if (!aOverCapacity && bOverCapacity) return 1;
                        if (aNearCapacity && !bNearCapacity) return -1;
                        if (!aNearCapacity && bNearCapacity) return 1;
                        
                        return (b.currentStock / b.capacityLimit) - (a.currentStock / a.capacityLimit);
                      })
                      .map((warehouse) => {
                        const usagePercent = ((warehouse.currentStock / warehouse.capacityLimit) * 100).toFixed(1);
                        const isOverCapacity = warehouse.freeSpace < 0;
                        const isNearCapacity = warehouse.freeSpace < warehouse.capacityLimit * 0.1;
                        
                        return (
                          <tr key={warehouse.location} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {warehouse.location}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {warehouse.currentStock.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {warehouse.capacityLimit.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-medium ${
                                isOverCapacity ? 'text-red-600' :
                                isNearCapacity ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {usagePercent}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-medium ${
                                isOverCapacity ? 'text-red-600' :
                                isNearCapacity ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {warehouse.freeSpace >= 0 ? 
                                  warehouse.freeSpace.toLocaleString() : 
                                  `Over by ${Math.abs(warehouse.freeSpace).toLocaleString()}`
                                }
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isOverCapacity ? 'bg-red-100 text-red-800' :
                                isNearCapacity ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {isOverCapacity ? 'Over Capacity' :
                                 isNearCapacity ? 'Near Capacity' :
                                 'Available'
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Location Management Tab */}
      {activeTab === 'locations' && (
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Location Management</h2>
            <div className="flex gap-3 items-center">
              <button
                onClick={fetchUsersWithLocations}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600 text-sm">
              Set geographic coordinates for farmers' pickup points, warehouse locations, and market vendor locations. 
              This enables accurate tracking and routing for deliveries.
            </p>
          </div>

          {filteredLocationUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {searchTerm ? `No users found matching "${searchTerm}"` : "No users found with the selected role filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Text Location</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Coordinates</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocationUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'farmer' ? 'bg-green-100 text-green-800' :
                          user.role === 'warehouse_manager' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'market_vendor' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'transporter' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {user.location || <span className="text-gray-400 italic">Not set</span>}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {user.coordinates?.latitude && user.coordinates?.longitude ? (
                          <div className="font-mono text-xs">
                            <div>{user.coordinates.latitude.toFixed(6)}</div>
                            <div>{user.coordinates.longitude.toFixed(6)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No coordinates</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.hasCoordinates ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.hasCoordinates ? 'Located' : 'No Location'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleSetLocation(user)}
                          className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
                            user.hasCoordinates ? 
                            'text-blue-600 hover:text-blue-800 hover:bg-blue-50' :
                            'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                          }`}
                        >
                          {user.hasCoordinates ? 'Update Location' : 'Set Location'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Location Setting Modal */}
      <Modal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)}>
        {selectedUserForLocation && (
          <div className="space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white pb-2 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Set Location - {selectedUserForLocation.name}
              </h2>
            </div>

            <div className="bg-gray-50 p-3 rounded text-sm">
              <span className="font-medium">{selectedUserForLocation.role.replace('_', ' ').charAt(0).toUpperCase() + selectedUserForLocation.role.replace('_', ' ').slice(1)}</span> • {selectedUserForLocation.email}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateLocation(); }} className="space-y-3">
              {/* Interactive Map Location Picker - Reduced Height */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Location on Map *</label>
                <div className="space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-xs text-blue-700">
                      💡 Click on the map to set coordinates. Zoom in for better accuracy.
                    </p>
                  </div>
                  
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <MapContainer 
                      center={locationForm.latitude && locationForm.longitude ? [parseFloat(locationForm.latitude), parseFloat(locationForm.longitude)] : [27.705545, 85.333525]} 
                      zoom={13} 
                      style={{ height: "250px", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <LocationMarkerModal 
                        position={locationForm.latitude && locationForm.longitude ? [parseFloat(locationForm.latitude), parseFloat(locationForm.longitude)] : null}
                        onLocationSelect={(position) => {
                          setLocationForm({
                            ...locationForm,
                            latitude: position[0].toString(),
                            longitude: position[1].toString()
                          });
                        }}
                      />
                    </MapContainer>
                  </div>
                  
                  {locationForm.latitude && locationForm.longitude && (
                    <div className="bg-gray-50 rounded p-2">
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-gray-500">Lat:</span>
                          <div className="font-bold text-gray-900">{parseFloat(locationForm.latitude).toFixed(6)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Lng:</span>
                          <div className="font-bold text-gray-900">{parseFloat(locationForm.longitude).toFixed(6)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={locationForm.address}
                    onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Street address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={locationForm.location}
                    onChange={(e) => setLocationForm({ ...locationForm, location: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Location name"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center space-x-2 pt-3 border-t">
                {/* Delete button on the left if user has coordinates */}
                <div>
                  {selectedUserForLocation.hasCoordinates && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to remove the location for ${selectedUserForLocation.name}? This action cannot be undone.`)) {
                          await handleRemoveLocation(selectedUserForLocation);
                          setShowLocationModal(false);
                        }
                      }}
                      className="bg-red-500 text-white px-3 py-1 text-sm rounded hover:bg-red-600 transition-colors"
                    >
                      Remove Location
                    </button>
                  )}
                </div>
                
                {/* Cancel and Update buttons on the right */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(false)}
                    className="bg-gray-500 text-white px-3 py-1 text-sm rounded hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600 transition-colors"
                  >
                    {selectedUserForLocation.hasCoordinates ? 'Update Location' : 'Set Location'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={showCreateUserModal} onClose={() => setShowCreateUserModal(false)}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Create New User</h2>
          </div>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., +1-555-123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={newUser.location}
                onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., New York, USA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="farmer">Farmer</option>
                <option value="transporter">Transporter</option>
                <option value="warehouse_manager">Warehouse Manager</option>
                <option value="market_vendor">Market Vendor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Profile Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">👤 Profile</h3>
            <button
              onClick={() => setShowProfileModal(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-5">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-200">
                {user?.profilePhoto ? (
                  <img 
                    src={user.profilePhoto} 
                    alt={user.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{user?.name}</h4>
                <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">Email Address</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{user?.email}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">Location</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{user?.location || 'Not specified'}</p>
              </div>
              
              {user?.phone && (
                <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Phone Number</span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{user.phone}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={() => setShowProfileModal(false)}
              className="px-6 py-3 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
            >
              Close
            </button>
            <button
              onClick={openEditProfile}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">✏️ Edit Profile</h3>
            <button
              onClick={() => setShowEditProfileModal(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          
          {profileError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{profileError}</p>
            </div>
          )}
          
          <form onSubmit={updateProfile} className="space-y-5">
            {/* Profile Picture Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture</label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-200">
                  {profileImagePreview ? (
                    <img 
                      src={profileImagePreview} 
                      alt="Profile preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={user.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <input
                    type="file"
                    id="profileImageInput"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('profileImageInput').click()}
                    className="flex items-center px-3 py-2 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-all text-sm font-medium"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Choose Photo
                  </button>
                  {(profileImagePreview || user?.profilePhoto) && (
                    <button
                      type="button"
                      onClick={removeProfileImage}
                      className="flex items-center px-3 py-2 bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Supported formats: JPG, PNG, GIF. Max size: 5MB.</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
              <div className="relative">
                <svg className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                  placeholder={user?.location || 'Enter your location'}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-10 pr-16 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white/80 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-red-600 hover:text-red-800 transition-colors rounded-lg hover:bg-red-50"
                  title="Pick location on map"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <svg className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  placeholder={user?.phone || 'Enter your phone number'}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Change Password (Optional)</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm({...profileForm, currentPassword: e.target.value})}
                    placeholder="Enter current password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white/80 backdrop-blur-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})}
                    placeholder="Enter new password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white/80 backdrop-blur-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white/80 backdrop-blur-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="px-6 py-3 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? (
                  <>
                    <svg className="h-4 w-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Update Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
      
      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" style={{backgroundColor: 'white', zIndex: 10001}}>
            <div className="p-6" style={{backgroundColor: 'white'}}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Choose Your Location</h3>
                <button
                  onClick={() => setShowLocationPicker(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <button
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGettingLocation ? (
                      <>
                        <svg className="h-4 w-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Use Current Location
                      </>
                    )}
                  </button>
                  <div className="text-sm text-gray-600 flex items-center">
                    <span>Or click on the map to select a location</span>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden" style={{height: '400px'}}>
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    onClick={handleMapClick}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {selectedCoordinates && (
                      <Marker position={selectedCoordinates}>
                        <Popup>Selected Location</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
                
                {selectedCoordinates && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Selected coordinates:</strong> {selectedCoordinates[0].toFixed(6)}, {selectedCoordinates[1].toFixed(6)}
                    </p>
                    {profileForm.location && (
                      <p className="text-sm text-red-700 mt-1">
                        <strong>Address:</strong> {profileForm.location}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowLocationPicker(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={selectLocationOnMap}
                    disabled={!selectedCoordinates}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Use This Location
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delivery Request Management Modal */}
      <Modal isOpen={showDeliveryModal} onClose={() => setShowDeliveryModal(false)}>
        {selectedDelivery && (
          <div className="space-y-6">
            <div className="sticky top-0 bg-white pb-3 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                </svg>
                Manage Delivery Request
              </h2>
            </div>
            
            <div className="max-h-[70vh] overflow-y-auto space-y-6">
              {/* Delivery Information */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Delivery Request #{selectedDelivery._id?.slice(-6) || 'N/A'}</h3>
                    <p className="text-sm text-gray-600">
                      Requested: {selectedDelivery.requestedDate 
                        ? new Date(selectedDelivery.requestedDate).toLocaleDateString()
                        : selectedDelivery.createdAt 
                          ? new Date(selectedDelivery.createdAt).toLocaleDateString()
                          : 'N/A'
                      }
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      selectedDelivery.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                      selectedDelivery.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                      selectedDelivery.urgency === 'low' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {(selectedDelivery.urgency || 'normal').toUpperCase()} PRIORITY
                    </span>
                  </div>
                </div>
              </div>

              {/* Farmer Information */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Farmer Information
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Location Available
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600 font-medium">Name:</label>
                    <p className="text-gray-900">{selectedDelivery.farmer?.name || selectedDelivery.farmerName || 'Unknown Farmer'}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 font-medium">Email:</label>
                    <p className="text-gray-900 break-words">{selectedDelivery.farmer?.email || selectedDelivery.farmerEmail || 'N/A'}</p>
                  </div>
                  {selectedDelivery.farmer?.phone && (
                    <div>
                      <label className="text-gray-600 font-medium">Phone:</label>
                      <p className="text-gray-900">{selectedDelivery.farmer.phone}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-gray-600 font-medium">Pickup Location:</label>
                    <p className="text-gray-900">{selectedDelivery.pickupLocation || selectedDelivery.location || 'Not specified'}</p>
                  </div>
                  {/* Farmer Coordinates */}
                  {selectedDelivery.farmer?.coordinates && (
                    <div className="md:col-span-2">
                      <label className="text-gray-600 font-medium">📍 GPS Coordinates:</label>
                      <p className="text-gray-900 font-mono text-xs">
                        Lat: {selectedDelivery.farmer.coordinates.latitude?.toFixed(6)}, 
                        Lng: {selectedDelivery.farmer.coordinates.longitude?.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Nearby Warehouses Suggestion */}
                {warehouseFreeSpace.length > 0 && selectedDelivery.farmer?.coordinates && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="text-xs font-medium text-blue-800 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      🗺️ Recommended Warehouses by Capacity
                    </h5>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {warehouseFreeSpace
                        .filter(w => w.freeSpace > 0) // Only show warehouses with available space
                        .sort((a, b) => b.freeSpace - a.freeSpace) // Sort by free space (most available first)
                        .slice(0, 3) // Show top 3 recommendations
                        .map((warehouse) => {
                          const usagePercent = ((warehouse.currentStock / warehouse.capacityLimit) * 100).toFixed(1);
                          const isNearCapacity = warehouse.freeSpace < warehouse.capacityLimit * 0.1;
                          
                          return (
                            <div 
                              key={warehouse.location}
                              className="flex justify-between items-center p-2 bg-white border rounded text-xs"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">{warehouse.location}</div>
                                <div className="text-gray-600">
                                  Free: {warehouse.freeSpace} units ({(100 - parseFloat(usagePercent)).toFixed(1)}% available)
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs ${
                                isNearCapacity ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {isNearCapacity ? '⚡ Near Full' : '✅ Good'}
                              </div>
                            </div>
                          );
                        })}
                      {warehouseFreeSpace.filter(w => w.freeSpace > 0).length === 0 && (
                        <div className="text-xs text-gray-600 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          ⚠️ All warehouses are at or over capacity. Consider alternative solutions.
                        </div>
                      )}
                    </div>
                    {warehouseFreeSpace.filter(w => w.freeSpace > 0).length > 3 && (
                      <div className="text-xs text-gray-500 mt-2 text-center">
                        Showing top 3 recommendations. Check Warehouses tab for full details.
                      </div>
                    )}
                  </div>
                )}
                
                {/* Capacity Warning */}
                {warehouseFreeSpace.filter(w => w.freeSpace > 0).length === 0 && warehouseFreeSpace.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-xs text-red-700">
                      <strong>⚠️ Capacity Alert:</strong> All warehouses are at or over capacity. 
                      Consider delaying this delivery or finding alternative storage solutions.
                    </div>
                  </div>
                )}
              </div>

              {/* Product Information */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Product Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-600 font-medium">Product:</label>
                    <p className="text-gray-900">{selectedDelivery.goodsDescription || selectedDelivery.productName || selectedDelivery.product || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-gray-600 font-medium">Quantity:</label>
                    <p className="text-gray-900">{selectedDelivery.quantity || 'N/A'} {selectedDelivery.unit || ''}</p>
                  </div>
                  {selectedDelivery.description && (
                    <div className="md:col-span-2">
                      <label className="text-gray-600 font-medium">Description:</label>
                      <p className="text-gray-900">{selectedDelivery.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transporter Selection */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Select Transporter
                </h4>
                <div className="space-y-3">
                  <select
                    value={selectedTransporterId}
                    onChange={(e) => setSelectedTransporterId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Select a transporter --</option>
                    {availableTransporters.map((transporter) => (
                      <option key={transporter._id} value={transporter._id}>
                        {transporter.name} - {transporter.location || 'Location not specified'}
                      </option>
                    ))}
                  </select>
                  
                  {selectedTransporterId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      {(() => {
                        const selectedTransporter = availableTransporters.find(t => t._id === selectedTransporterId);
                        return selectedTransporter ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                              {selectedTransporter.profilePhoto ? (
                                <img 
                                  src={selectedTransporter.profilePhoto} 
                                  alt={selectedTransporter.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                                  {(selectedTransporter.name || '').split(' ').map(n => n[0] || '').join('').slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{selectedTransporter.name}</div>
                              <div className="text-xs text-gray-500">{selectedTransporter.email}</div>
                              {selectedTransporter.phone && (
                                <div className="text-xs text-gray-500">{selectedTransporter.phone}</div>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })()
                      }
                    </div>
                  )}
                  
                  {availableTransporters.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No available transporters at this time.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Warehouse Selection */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Select Warehouse
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Capacity Info Available
                  </span>
                </h4>
                
                
                {/* Warehouse Free Space Overview */}
                {warehouseFreeSpace.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">📊 Warehouse Capacity Overview</h5>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {warehouseFreeSpace.map((warehouse) => {
                        const usagePercent = ((warehouse.currentStock / warehouse.capacityLimit) * 100).toFixed(1);
                        const isOverCapacity = warehouse.freeSpace < 0;
                        const isNearCapacity = warehouse.freeSpace < warehouse.capacityLimit * 0.1;
                        
                        return (
                          <div 
                            key={warehouse.location} 
                            className={`flex justify-between items-center p-2 rounded text-xs ${
                              isOverCapacity ? 'bg-red-100 border border-red-200' :
                              isNearCapacity ? 'bg-yellow-100 border border-yellow-200' :
                              'bg-green-100 border border-green-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 truncate">{warehouse.location}</div>
                              <div className="text-gray-600">
                                {warehouse.currentStock} / {warehouse.capacityLimit} units ({usagePercent}%)
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isOverCapacity ? 'bg-red-200 text-red-800' :
                              isNearCapacity ? 'bg-yellow-200 text-yellow-800' :
                              'bg-green-200 text-green-800'
                            }`}>
                              {isOverCapacity ? 
                                `Over by ${Math.abs(warehouse.freeSpace)}` :
                                `Free: ${warehouse.freeSpace}`
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Select delivery destination --</option>
                    {getCombinedWarehouses().map((warehouse) => {
                      if (warehouse.type === 'user') {
                        // Warehouse manager with coordinates
                        console.log('🔍 Debug - Rendering warehouse manager:', warehouse.name, 'Location:', warehouse.location);
                        return (
                          <option key={warehouse._id} value={warehouse._id}>
                            🏪 {warehouse.name} (Warehouse Manager) - {warehouse.location}
                          </option>
                        );
                      } else {
                        // Traditional warehouse
                        console.log('🔍 Debug - Rendering traditional warehouse:', warehouse.name, 'Location:', warehouse.location);
                        const freeSpaceInfo = warehouseFreeSpace.find(w => w.location === warehouse.location);
                        const freeSpaceText = freeSpaceInfo ? 
                          (freeSpaceInfo.freeSpace >= 0 ? 
                            ` (${freeSpaceInfo.freeSpace} free)` : 
                            ` (OVER CAPACITY by ${Math.abs(freeSpaceInfo.freeSpace)})`) : '';
                        
                        return (
                          <option key={warehouse._id} value={warehouse._id}>
                            {warehouse.name} - {warehouse.location || 'Location not specified'}{freeSpaceText}
                          </option>
                        );
                      }
                    })}
                  </select>
                  
                  {selectedWarehouseId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      {(() => {
                        const selectedWarehouse = getCombinedWarehouses().find(w => w._id === selectedWarehouseId);
                        const freeSpaceInfo = selectedWarehouse?.type === 'warehouse' ? 
                          warehouseFreeSpace.find(w => w.location === selectedWarehouse?.location) : null;
                        
                        return selectedWarehouse ? (
                          <div>
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-blue-100 border border-blue-200">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {selectedWarehouse.name}
                                  {selectedWarehouse.type === 'user' && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      Warehouse Manager
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">{selectedWarehouse.location || 'Location not specified'}</div>
                                {selectedWarehouse.coordinates && (
                                  <div className="text-xs text-green-600 mt-1">
                                    📍 Coordinates: {selectedWarehouse.coordinates.latitude?.toFixed(4)}, {selectedWarehouse.coordinates.longitude?.toFixed(4)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Capacity Details - Only for traditional warehouses */}
                            {selectedWarehouse.type === 'warehouse' && freeSpaceInfo && (
                              <div className="bg-white p-3 rounded border">
                                <h6 className="text-xs font-medium text-gray-700 mb-2">📦 Capacity Details</h6>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-600">Current Stock:</span>
                                    <span className="ml-1 font-medium">{freeSpaceInfo.currentStock}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Capacity:</span>
                                    <span className="ml-1 font-medium">{freeSpaceInfo.capacityLimit}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Free Space:</span>
                                    <span className={`ml-1 font-medium ${freeSpaceInfo.freeSpace >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {freeSpaceInfo.freeSpace}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Usage:</span>
                                    <span className="ml-1 font-medium">{Math.round((freeSpaceInfo.currentStock / freeSpaceInfo.capacityLimit) * 100)}%</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Warehouse Manager Details */}
                            {selectedWarehouse.type === 'user' && (
                              <div className="bg-white p-3 rounded border">
                                <h6 className="text-xs font-medium text-gray-700 mb-2">👤 Manager Details</h6>
                                <div className="text-xs space-y-1">
                                  <div>
                                    <span className="text-gray-600">Email:</span>
                                    <span className="ml-1 font-medium">{selectedWarehouse.user.email}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Contact:</span>
                                    <span className="ml-1 font-medium">{selectedWarehouse.user.phone || 'Not provided'}</span>
                                  </div>
                                  <div className="text-green-600 mt-2">
                                    ✅ Location coordinates set by admin
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                  
                  {warehouses.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No warehouses available at this time.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Scheduling */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Delivery Schedule (Optional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pickup Time Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Pickup Time
                    </label>
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={tempPickupTime}
                          onChange={(e) => setTempPickupTime(e.target.value)}
                          onBlur={() => {
                            // Auto-confirm when user finishes interacting with the datetime picker
                            if (tempPickupTime && tempPickupTime !== scheduledPickupTime) {
                              setTimeout(() => {
                                setScheduledPickupTime(tempPickupTime);
                                setTempPickupTime('');
                              }, 100); // Small delay to ensure the value is set
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        {tempPickupTime && tempPickupTime !== scheduledPickupTime && (
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledPickupTime(tempPickupTime);
                              setTempPickupTime('');
                            }}
                            className="absolute right-1 top-1 bottom-1 bg-blue-500 text-white px-2 rounded text-xs hover:bg-blue-600 transition-colors flex items-center justify-center"
                            style={{ width: '60px' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {scheduledPickupTime && (
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <p className="text-xs text-green-700">
                            <strong>Confirmed:</strong> {new Date(scheduledPickupTime).toLocaleString()}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledPickupTime('');
                              setTempPickupTime('');
                            }}
                            className="text-xs text-red-600 hover:text-red-800 mt-1"
                          >
                            Clear selection
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delivery Time Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Delivery Time
                    </label>
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={tempDeliveryTime}
                          onChange={(e) => setTempDeliveryTime(e.target.value)}
                          onBlur={() => {
                            // Auto-confirm when user finishes interacting with the datetime picker
                            if (tempDeliveryTime && tempDeliveryTime !== scheduledDeliveryTime) {
                              setTimeout(() => {
                                setScheduledDeliveryTime(tempDeliveryTime);
                                setTempDeliveryTime('');
                              }, 100); // Small delay to ensure the value is set
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min={scheduledPickupTime || new Date().toISOString().slice(0, 16)}
                        />
                        {tempDeliveryTime && tempDeliveryTime !== scheduledDeliveryTime && (
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledDeliveryTime(tempDeliveryTime);
                              setTempDeliveryTime('');
                            }}
                            className="absolute right-1 top-1 bottom-1 bg-blue-500 text-white px-2 rounded text-xs hover:bg-blue-600 transition-colors flex items-center justify-center"
                            style={{ width: '60px' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {scheduledDeliveryTime && (
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <p className="text-xs text-green-700">
                            <strong>Confirmed:</strong> {new Date(scheduledDeliveryTime).toLocaleString()}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledDeliveryTime('');
                              setTempDeliveryTime('');
                            }}
                            className="text-xs text-red-600 hover:text-red-800 mt-1"
                          >
                            Clear selection
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Select a date and time, then click the OK button to confirm your selection. This helps farmers and transporters plan better and receive accurate notifications.
                </p>
              </div>

              {/* Action Notes */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notes (Optional)
                </h4>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectDelivery(selectedDelivery._id || selectedDelivery.id)}
                disabled={deliveryActionLoading === (selectedDelivery._id || selectedDelivery.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {deliveryActionLoading === (selectedDelivery._id || selectedDelivery.id) ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Request
                  </>
                )}
              </button>
            <button
              onClick={() => handleAcceptDelivery(selectedDelivery._id || selectedDelivery.id)}
              disabled={deliveryActionLoading === (selectedDelivery._id || selectedDelivery.id) || !selectedTransporterId || !selectedWarehouseId}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {deliveryActionLoading === (selectedDelivery._id || selectedDelivery.id) ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Accepting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept & Assign
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Warehouse Modal */}
      <Modal isOpen={showAddWarehouseModal} onClose={() => setShowAddWarehouseModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Warehouse</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse Manager *
              </label>
              <select
                value={newWarehouse.managerId}
                onChange={(e) => {
                  const managerId = e.target.value;
                  const selectedManager = users.find(u => u._id === managerId);
                  
                  if (selectedManager && selectedManager.coordinates) {
                    setNewWarehouse({
                      ...newWarehouse,
                      managerId,
                      location: selectedManager.location || '',
                      coordinates: {
                        latitude: selectedManager.coordinates.latitude?.toString() || '',
                        longitude: selectedManager.coordinates.longitude?.toString() || ''
                      }
                    });
                  } else {
                    setNewWarehouse({
                      ...newWarehouse,
                      managerId,
                      location: selectedManager?.location || '',
                      coordinates: { latitude: '', longitude: '' }
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select a warehouse manager --</option>
                {users
                  .filter(u => u.role === 'warehouse_manager' && u.approved)
                  .map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.name} - {manager.location || 'No location set'}
                      {manager.coordinates ? ' ✓' : ' (No coordinates)'}
                    </option>
                  ))
                }
              </select>
              {users.filter(u => u.role === 'warehouse_manager' && u.approved).length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ No approved warehouse managers found. Please ensure warehouse managers are registered and approved.
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse Location *
              </label>
              <input
                type="text"
                value={newWarehouse.location}
                onChange={(e) => setNewWarehouse({...newWarehouse, location: e.target.value})}
                placeholder="Enter warehouse location (e.g., Mumbai Central Warehouse)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly={newWarehouse.managerId}
              />
              {newWarehouse.managerId && (
                <p className="text-xs text-blue-600 mt-1">
                  📍 Location auto-populated from selected manager
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity Limit *
              </label>
              <input
                type="number"
                value={newWarehouse.capacityLimit}
                onChange={(e) => setNewWarehouse({...newWarehouse, capacityLimit: e.target.value})}
                placeholder="Enter capacity limit (e.g., 10000)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude {newWarehouse.managerId ? '' : '(Optional)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={newWarehouse.coordinates.latitude}
                  onChange={(e) => setNewWarehouse({
                    ...newWarehouse, 
                    coordinates: {...newWarehouse.coordinates, latitude: e.target.value}
                  })}
                  placeholder="e.g., 19.0760"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readOnly={newWarehouse.managerId}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude {newWarehouse.managerId ? '' : '(Optional)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={newWarehouse.coordinates.longitude}
                  onChange={(e) => setNewWarehouse({
                    ...newWarehouse, 
                    coordinates: {...newWarehouse.coordinates, longitude: e.target.value}
                  })}
                  placeholder="e.g., 72.8777"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readOnly={newWarehouse.managerId}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>📍 Manager Selection:</strong> When you select a warehouse manager, their location and coordinates will be automatically used for the warehouse.
              </p>
              {!newWarehouse.managerId && (
                <p className="text-xs text-blue-700 mt-1">
                  <strong>💡 Tip:</strong> You can also manually enter coordinates if no manager is selected.
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAddWarehouseModal(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddWarehouse}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Add Warehouse
            </button>
          </div>
        </div>
      </Modal>
      
    </div>
  );
};

export default AdminDashboard;
