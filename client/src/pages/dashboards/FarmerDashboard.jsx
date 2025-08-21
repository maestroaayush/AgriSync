
import { useEffect, useState } from "react";
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
import { 
  Package2, 
  TrendingUp, 
  Truck, 
  AlertTriangle, 
  Plus, 
  Send, 
  Bell, 
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Zap,
  Activity,
  Eye,
  Edit3,
  Trash2,
  Check,
  X,
  Filter,
  Search,
  Download,
  Upload,
  BarChart3,
  PieChart as PieChartIcon,
  Warehouse,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Settings,
  RefreshCw,
  Menu,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  User,
  Calendar as CalendarIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import TransporterMap from "../../components/TransporterMap";
import Modal from "../../components/ui/Modal";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function FarmerDashboard() {
  // Core data states
  const [inventory, setInventory] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [warehouse, setWarehouse] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [inventoryTrends, setInventoryTrends] = useState([]);
  const [deliveryAnalytics, setDeliveryAnalytics] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [earningsReport, setEarningsReport] = useState(null);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showTransporterRequestModal, setShowTransporterRequestModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
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
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]); // Default to Mumbai
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Form states
  const [newInventoryItem, setNewInventoryItem] = useState({
    itemName: '',
    category: 'other',
    quantity: '',
    unit: 'kg',
    price: '',
    location: ''
  });
  const [deliveryRequest, setDeliveryRequest] = useState({
    itemName: '',
    quantity: '',
    maxQuantity: 0,
    unit: 'units',
    urgency: 'normal',
    notes: '',
    pickupLocation: '',
    dropoffLocation: ''
  });
  const [transporterRequest, setTransporterRequest] = useState({
    pickupLocation: '',
    dropoffLocation: '',
    goodsDescription: '',
    quantity: '',
    urgency: 'normal'
  });
  
  // Filter states
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const COLORS = ["#60A5FA", "#F59E0B", "#34D399", "#F472B6", "#A78BFA"];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const formatDate = (date) => date?.toISOString().split("T")[0] || "";
  const buildUrl = (endpoint) => {
    const q = [];
    if (from) q.push(`from=${formatDate(from)}`);
    if (to) q.push(`to=${formatDate(to)}`);
    return `${endpoint}${q.length ? `?${q.join("&")}` : ""}`;
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/inventory/logs/recent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data);
    } catch (err) {
      console.error("Log fetch failed", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/inventory/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics fetch failed", err);
    }
  };

  const addInventoryItem = async () => {
    console.log('🚀 Adding inventory item:', newInventoryItem);
    console.log('🔑 Token:', token ? 'Present' : 'Missing');
    console.log('👤 User:', user);
    
    // Ensure location is set from user data
    const itemToSend = {
      ...newInventoryItem,
      location: user?.location || 'Default Location'
    };
    
    console.log('📦 Final item data being sent:', itemToSend);
    console.log('🏠 User location:', user?.location);
    console.log('📍 Item location field:', itemToSend.location);
    
    // Validate required fields
    if (!itemToSend.itemName || !itemToSend.quantity) {
      console.error('❌ Missing required fields');
      alert('Please fill in all required fields (Item Name and Quantity)');
      return;
    }
    
    if (!itemToSend.location) {
      console.error('❌ Missing location field');
      alert('Location is required. Please ensure your profile has a location set.');
      return;
    }
    
    try {
      console.log('📤 Sending request to API...');
      const response = await axios.post("http://localhost:5000/api/farmer/inventory/add", itemToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('✅ Inventory item added successfully:', response.data);
      
      // Create notification for successful inventory addition
      try {
        await axios.post(
          'http://localhost:5000/api/notifications',
          {
            title: 'Inventory Added Successfully',
            message: `${newInventoryItem.quantity} ${newInventoryItem.unit} of ${newInventoryItem.itemName} has been added to your inventory.`,
            type: 'success'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('📱 Notification created');
      } catch (notificationErr) {
        console.error('Failed to create notification:', notificationErr);
      }
      
      console.log('🔄 Refreshing data and closing modal...');
      setShowAddModal(false);
      setNewInventoryItem({
        itemName: '',
        category: 'other',
        quantity: '',
        unit: 'kg',
        price: '',
        location: user?.location || ''
      });
      fetchInventory();
      fetchLogs();
      // Note: Notification will be fetched by the interval, no need to fetch manually
      
      // Show success message
      alert('Inventory item added successfully!');
      
    } catch (err) {
      console.error("❌ Failed to add inventory item:", err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // Show user-friendly error message
      const errorMessage = err.response?.data?.message || 'Failed to add inventory item. Please try again.';
      alert(errorMessage);
      
      // Create error notification
      try {
        await axios.post(
          'http://localhost:5000/api/notifications',
          {
            title: 'Inventory Addition Failed',
            message: `Failed to add ${newInventoryItem.itemName} to inventory. Please try again.`,
            type: 'error'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Note: Notification will be fetched by the interval, no need to fetch manually
      } catch (notificationErr) {
        console.error('Failed to create error notification:', notificationErr);
      }
    }
  };

  const deleteInventoryItem = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/inventory/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchInventory();
      fetchLogs();
    } catch (err) {
      console.error("Failed to delete inventory item", err);
    }
  };

  const updateInventoryItem = async () => {
    try {
      await axios.put(`http://localhost:5000/api/inventory/${selectedInventoryItem._id}`, selectedInventoryItem, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowEditModal(false);
      setSelectedInventoryItem(null);
      fetchInventory();
      fetchLogs();
    } catch (err) {
      console.error("Failed to update inventory item", err);
    }
  };

  const requestDelivery = async () => {
    console.log('🚚 Starting delivery request...');
    console.log('📦 Current deliveryRequest state:', deliveryRequest);
    console.log('👤 Current user:', user);
    console.log('🔑 Token available:', !!token);
    console.log('🔐 Token value (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
    console.log('🆔 User ID:', user?.id || user?._id);
    console.log('🏠 User location:', user?.location);
    
    // Check authentication first
    if (!token) {
      console.error('❌ No authentication token found');
      alert('Authentication token missing. Please login again.');
      // Try to redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }
    
    if (!user) {
      console.error('❌ No user data found');
      alert('User data missing. Please login again.');
      // Try to redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }
    
    // Check for both possible ID field names
    const userId = user.id || user._id;
    if (!userId) {
      console.error('❌ User ID missing from user object:', user);
      alert('User ID is missing. Please login again.');
      // Try to redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }
    
    // Validate required fields
    if (!deliveryRequest.itemName) {
      console.error('❌ Missing item name');
      alert('Please select an item from your inventory');
      return;
    }
    
    if (!deliveryRequest.quantity || deliveryRequest.quantity <= 0) {
      console.error('❌ Invalid quantity:', deliveryRequest.quantity);
      alert('Please enter a valid quantity');
      return;
    }
    
    
    try {
      // Prepare delivery request data with pickup location from user
      const deliveryData = {
        ...deliveryRequest,
        status: 'pending',
        requestedBy: userId, // Use the validated userId variable
        pickupLocation: user?.location || 'Farm Location',
        goodsDescription: deliveryRequest.itemName
      };
      
      console.log('📤 Sending delivery data:', deliveryData);
      
      const response = await axios.post("http://localhost:5000/api/deliveries", deliveryData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('✅ Delivery request response:', response.data);
      
      // Create notification for successful delivery request
      try {
        await axios.post(
          'http://localhost:5000/api/notifications',
          {
            title: 'Delivery Request Submitted Successfully',
            message: `Your delivery request for ${deliveryRequest.quantity} ${deliveryRequest.unit} of ${deliveryRequest.itemName} has been submitted with ${deliveryRequest.urgency} priority. Our admin team will assign the optimal warehouse and notify you once a transporter is assigned.`,
            type: 'info'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('📱 Notification created successfully');
      } catch (notificationErr) {
        console.error('Failed to create notification:', notificationErr);
      }
      
      setShowDeliveryModal(false);
      setDeliveryRequest({
        itemName: '',
        quantity: '',
        maxQuantity: 0,
        unit: 'units',
        urgency: 'normal',
        notes: '',
        pickupLocation: '',
        dropoffLocation: ''
      });
      fetchDeliveries();
      // Note: Notification will be fetched by the interval, no need to fetch manually
      alert('Delivery request submitted successfully! Our admin team will review and assign the best warehouse for your goods.');
    } catch (err) {
      console.error('❌ Failed to request delivery:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error message:', err.message);
      
      // Show user-friendly error message
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to submit delivery request. Please try again.';
      alert(`Delivery request failed: ${errorMessage}`);
      
      // Create error notification
      try {
        await axios.post(
          'http://localhost:5000/api/notifications',
          {
            title: 'Delivery Request Failed',
            message: `Failed to submit delivery request for ${deliveryRequest.itemName}. Error: ${errorMessage}`,
            type: 'error'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Note: Notification will be fetched by the interval, no need to fetch manually
      } catch (notificationErr) {
        console.error('Failed to create error notification:', notificationErr);
      }
    }
  };

  const requestTransporter = async () => {
    try {
      await axios.post("http://localhost:5000/api/deliveries/request-transporter", transporterRequest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowTransporterRequestModal(false);
      setTransporterRequest({
        pickupLocation: '',
        dropoffLocation: '',
        goodsDescription: '',
        quantity: '',
        urgency: 'normal'
      });
      fetchDeliveries();
      alert('Transporter request submitted successfully! Admin will review and assign a transporter.');
    } catch (err) {
      console.error("Failed to request transporter", err);
      alert('Failed to submit transporter request. Please try again.');
    }
  };

  useEffect(() => {
    document.title = "Farmer Dashboard — AgriSync";
    console.log('🚀 FarmerDashboard useEffect - user:', user);
    console.log('📸 User profile photo:', user?.profilePhoto);
    console.log('🔑 Token available:', !!token);
    console.log('🗄️ Local storage user:', localStorage.getItem('user'));

    // Redirect to login if no user
    if (!user) {
      console.log('No user found, redirecting to login');
      navigate("/login");
      return;
    }

    // Redirect if role is not farmer
    if (user.role !== "farmer") {
      console.log(`User role is ${user.role}, redirecting to appropriate dashboard`);
      if (user?.role) {
        navigate(`/${user.role}/dashboard`);
      } else {
        navigate("/");
      }
      return;
    }

    console.log('User is farmer, loading dashboard data');
    
    // Set initial location for new inventory items
    setNewInventoryItem(prev => ({
      ...prev,
      location: user?.location || ''
    }));
    
    // Load dashboard data
    loadAllData();
    
    // Set up real-time notification polling
    const notificationInterval = setInterval(() => {
      fetchNotifications();
      fetchDeliveries(); // Also check for delivery updates
    }, 30000); // Check every 30 seconds
    
    // Set up periodic data refresh
    const dataRefreshInterval = setInterval(() => {
      loadAllData();
    }, 5 * 60000); // Refresh all data every 5 minutes
    
    // Cleanup intervals on component unmount
    return () => {
      clearInterval(notificationInterval);
      clearInterval(dataRefreshInterval);
    };
  }, []); // Empty dependency array to run only once on mount

  // Enhanced analytics functions
  const fetchInventoryTrends = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/inventory/analytics/trends', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventoryTrends(res.data);
    } catch (err) {
      console.error('Inventory trends fetch failed', err);
    }
  };

  const fetchDeliveryAnalytics = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/deliveries/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeliveryAnalytics(res.data);
    } catch (err) {
      console.error('Delivery analytics fetch failed', err);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/inventory/analytics/performance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPerformanceMetrics(res.data);
    } catch (err) {
      console.error('Performance metrics fetch failed', err);
    }
  };

  // Comprehensive data loading function
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInventory(),
        fetchDeliveries(),
        fetchWarehouseInfo(),
        fetchLogs(),
        fetchAnalytics(),
        fetchNotifications(),
        fetchOrders(),
        fetchInventoryTrends(),
        fetchDeliveryAnalytics(),
        fetchPerformanceMetrics()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced notification system
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Notifications fetch failed', err);
    }
  };

  // Fetch orders/requests
  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data || []);
    } catch (err) {
      console.error('Orders fetch failed', err);
    }
  };

  // Enhanced analytics function
  const generateAnalytics = () => {
    const safeInventory = (inventory || []).filter(Boolean).filter(item => item && item.itemName);
    const totalItems = safeInventory.length;
    const totalQuantity = safeInventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    const pendingDeliveries = deliveries.filter(d => d.status === 'pending').length;
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const recentActivities = logs.length;
    
    return {
      totalItems,
      totalQuantity,
      pendingDeliveries,
      completedDeliveries,
      recentActivities,
      deliverySuccessRate: completedDeliveries > 0 ? ((completedDeliveries / (completedDeliveries + pendingDeliveries)) * 100).toFixed(1) : 0,
      averageQuantityPerItem: totalItems > 0 ? (totalQuantity / totalItems).toFixed(1) : 0
    };
  };

  // Export data functions using server-side endpoints
  const exportInventoryData = () => {
    const baseUrl = buildUrl("http://localhost:5000/api/export/farmer/deliveries");
    window.location.href = baseUrl;
  };

  const exportDeliveryData = () => {
    const baseUrl = buildUrl("http://localhost:5000/api/export/farmer/deliveries");
    window.location.href = baseUrl;
  };

  // Bulk operations
  const bulkDeleteInventory = async (itemIds) => {
    try {
      await Promise.all(
        itemIds.map(id => 
          axios.delete(`http://localhost:5000/api/inventory/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      fetchInventory();
      fetchLogs();
    } catch (err) {
      console.error('Bulk delete failed', err);
    }
  };

  // Enhanced search and filter functions
  const resetFilters = () => {
    setSearchTerm('');
    setInventoryFilter('all');
    setDeliveryFilter('all');
    setFrom(null);
    setTo(null);
  };

  // Notification management
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

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`http://localhost:5000/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  // Quick stats calculator
  const getQuickStats = () => {
    const safeInventory = (inventory || []).filter(Boolean).filter(item => item && item.itemName);
    const lowStockItems = safeInventory.filter(item => parseInt(item.quantity) < 10).length;
    const urgentDeliveries = deliveries.filter(d => d.urgency === 'urgent' && d.status === 'pending').length;
    const todayDeliveries = deliveries.filter(d => 
      new Date(d.createdAt).toDateString() === new Date().toDateString()
    ).length;
    
    return { lowStockItems, urgentDeliveries, todayDeliveries };
  };

  // Enhanced delivery confirmation with inventory update
  const confirmDeliveryEnhanced = async (delivery) => {
    try {
      // Update delivery status
      await axios.put(
        `http://localhost:5000/api/deliveries/${delivery._id}/status`,
        { status: "delivered" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add to inventory if it's an incoming delivery
      if (delivery.type === 'incoming' || !delivery.type) {
        await axios.post(
          `http://localhost:5000/api/inventory`,
          {
            itemName: delivery.goodsDescription || delivery.itemName,
            quantity: delivery.quantity,
            unit: delivery.unit || "units",
            location: delivery.dropoffLocation || user.location,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Create notification
      await axios.post(
        'http://localhost:5000/api/notifications',
        {
          title: 'Delivery Confirmed',
          message: `Delivery of ${delivery.quantity} ${delivery.goodsDescription || delivery.itemName} has been confirmed.`,
          type: 'success'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      loadAllData();
    } catch (err) {
      console.error("Failed to confirm delivery", err);
    }
  };

  // Enhanced inventory management
  const updateInventoryQuantity = async (itemId, newQuantity) => {
    try {
      await axios.put(`http://localhost:5000/api/inventory/${itemId}`, 
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchInventory();
      fetchLogs();
    } catch (err) {
      console.error('Failed to update quantity', err);
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


  const fetchInventory = async () => {
    try {
      // Get user's own inventory
      const res = await axios.get('http://localhost:5000/api/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(res.data);
    } catch (err) {
      console.error("Inventory load failed", err);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/deliveries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // For farmers, show all deliveries (can be filtered later if needed)
      setDeliveries(res.data || []);
    } catch (err) {
      console.error("Deliveries load failed", err);
      setDeliveries([]); // Set empty array on error
    }
  };

  const fetchWarehouseInfo = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/warehouses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const match = res.data.find((w) => w.location === user.location);
      setWarehouse(match);
    } catch (err) {
      console.error("Warehouse info failed", err);
    }
  };

  const confirmDelivery = async (delivery) => {
    try {
      await axios.put(
        `http://localhost:5000/api/deliveries/${delivery._id}/status`,
        { status: "delivered" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.post(
        `http://localhost:5000/api/inventory`,
        {
          itemName: delivery.goodsDescription,
          quantity: delivery.quantity,
          unit: "units",
          location: delivery.dropoffLocation,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchDeliveries();
      fetchInventory();
    } catch (err) {
      console.error("Failed to confirm delivery", err);
    }
  };

  const safeInventoryForCalculations = (inventory || []).filter(Boolean).filter(item => item && item.itemName && item.quantity);
  const totalStored = safeInventoryForCalculations.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
  const capacityUsed = warehouse ? ((totalStored / warehouse.capacityLimit) * 100).toFixed(1) : 0;
  
  // Prepare chart data
  const inventoryChartData = safeInventoryForCalculations.map((item, index) => ({
    name: item.itemName,
    value: parseInt(item.quantity) || 0,
    fill: COLORS[index % COLORS.length]
  }));

  const deliveryStatusData = [
    { name: 'Pending', value: deliveries.filter(d => d.status === 'pending').length, fill: '#F59E0B' },
    { name: 'In Transit', value: deliveries.filter(d => d.status === 'in_transit' || d.status === 'assigned').length, fill: '#60A5FA' },
    { name: 'Delivered', value: deliveries.filter(d => d.status === 'delivered').length, fill: '#34D399' }
  ];

  // Create safe inventory array without null/undefined items
  const safeInventory = (inventory || []).filter(Boolean).filter(item => item && item.itemName);
  
  const filteredInventory = safeInventory.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (inventoryFilter === 'all' || item.unit === inventoryFilter)
  );

  const filteredDeliveries = deliveries.filter(delivery => 
    (deliveryFilter === 'all' || delivery.status === deliveryFilter)
  );

  // Debug logging for filter states
  console.log('🔍 Debug Filter Info:');
  console.log('- inventoryFilter:', inventoryFilter);
  console.log('- deliveryFilter:', deliveryFilter);
  console.log('- searchTerm:', searchTerm);
  console.log('- safeInventory length:', safeInventory.length);
  console.log('- deliveries length:', deliveries.length);
  console.log('- filteredInventory length:', filteredInventory.length);
  console.log('- filteredDeliveries length:', filteredDeliveries.length);
  if (safeInventory.length > 0) {
    console.log('- sample inventory units:', safeInventory.slice(0, 3).map(item => item.unit));
  }
  if (deliveries.length > 0) {
    console.log('- sample delivery statuses:', deliveries.slice(0, 3).map(d => d.status));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
      {/* Background decorative elements - ensure they can't interfere with clicks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -10 }}>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-emerald-300/30 rounded-full blur-3xl" style={{ pointerEvents: 'none' }}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-200/30 to-cyan-300/30 rounded-full blur-3xl" style={{ pointerEvents: 'none' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-100/20 to-blue-100/20 rounded-full blur-3xl" style={{ pointerEvents: 'none' }}></div>
      </div>
      
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Package2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">AgriSync</h1>
                  <p className="text-xs text-gray-500">Farm Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <Bell className="h-6 w-6 text-gray-600 cursor-pointer hover:text-green-600 transition-colors duration-200" onClick={() => setShowNotificationModal(true)} />
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
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 100 }}>
        {/* Welcome Section */}
        <div className="mb-8 relative z-10">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
                  Welcome back, {user?.name}! 🌱
                </h2>
                <p className="text-gray-600 text-lg">Here's what's happening with your farm today.</p>
                <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{user?.location || 'Unknown Location'}</span>
                  </div>
                </div>
              </div>
              
              {/* Profile Photo on the right */}
              <div className="ml-8 flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border-4 border-white shadow-lg bg-gradient-to-br from-green-400 to-emerald-500">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={user.name} 
                      className="w-full h-full object-cover" 
                      onLoad={() => console.log('✅ Profile photo loaded:', user.profilePhoto)}
                      onError={(e) => {
                        console.error('❌ Failed to load profile photo:', user.profilePhoto);
                        console.error('Error details:', e);
                        // Hide the broken image by setting display none
                        e.target.style.display = 'none';
                        // Show the default icon instead
                        e.target.nextSibling?.classList?.remove('hidden');
                      }}
                    />
                  ) : null}
                  
                  {/* Default user icon - shows when no photo or photo fails to load */}
                  <User className={`h-12 w-12 text-white ${user?.profilePhoto ? 'hidden' : ''}`} />
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
                className="w-full px-4 py-3 rounded-xl border-none bg-white/50 text-gray-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="overview">📊 Overview</option>
                <option value="inventory">📦 Inventory</option>
                <option value="deliveries">🚛 Deliveries</option>
                <option value="analytics">📈 Analytics</option>
              </select>
            </div>
            
            {/* Desktop Tab Navigation */}
            <nav className="hidden md:flex md:space-x-2 lg:space-x-3">
              {[
                { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: BarChart3, color: 'emerald' },
                { id: 'inventory', label: 'Inventory', shortLabel: 'Inventory', icon: Package2, color: 'blue' },
                { id: 'deliveries', label: 'Deliveries', shortLabel: 'Delivery', icon: Truck, color: 'purple' },
                { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: TrendingUp, color: 'orange' }
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
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Inventory</p>
                    <p className="text-3xl font-bold text-gray-900">{inventory.length}</p>
                  </div>
                  <Package2 className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">+2.1% from last month</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                    <p className="text-3xl font-bold text-gray-900">{deliveries.filter(d => d.status === 'pending').length}</p>
                  </div>
                  <Truck className="h-12 w-12 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">+5 new requests</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                    <p className="text-3xl font-bold text-gray-900">{totalStored}</p>
                  </div>
                  <Warehouse className="h-12 w-12 text-purple-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">kg stored</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recent Activities</p>
                    <p className="text-3xl font-bold text-gray-900">{logs.length}</p>
                  </div>
                  <Activity className="h-12 w-12 text-orange-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">this week</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Inventory Distribution */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Distribution</h3>
                {inventoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inventoryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {inventoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No inventory data available
                  </div>
                )}
              </div>

              {/* Delivery Status */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Status</h3>
                {deliveryStatusData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={deliveryStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={(entry) => entry.fill} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No delivery data available
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
                >
                  <Plus className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-700">Add Inventory</span>
                </button>
                <button
                  onClick={() => setShowDeliveryModal(true)}
                  className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <Send className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-blue-700">Request Delivery</span>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                >
                  <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-700">View Analytics</span>
                </button>
                <button
                  onClick={() => fetchLogs()}
                  className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
                >
                  <RefreshCw className="h-8 w-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium text-orange-700">Refresh Data</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <button className="text-sm text-green-600 hover:text-green-700">View All</button>
                </div>
                {logs.length > 0 ? (
                  <div className="space-y-4">
                    {logs.slice(0, 5).map((log, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <Activity className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{log.action || 'Activity'}</p>
                          <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0" style={{ position: 'relative', zIndex: 1000 }}>
              <div className="flex items-center space-x-4" style={{ position: 'relative', zIndex: 1001 }}>
                <div className="relative" style={{ zIndex: 1002 }}>
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    style={{ 
                      pointerEvents: 'auto !important',
                      zIndex: 1003,
                      position: 'relative',
                      backgroundColor: '#ffffff',
                      border: '2px solid #d1d5db'
                    }}
                  />
                </div>
                <select
                  value={inventoryFilter}
                  onChange={(e) => {
                    console.log('📦 Inventory filter changed:', e.target.value);
                    setInventoryFilter(e.target.value);
                  }}
                  onClick={(e) => {
                    console.log('🖱️ Inventory dropdown clicked!');
                    e.stopPropagation();
                  }}
                  onFocus={() => console.log('🎯 Inventory dropdown focused')}
                  onBlur={() => console.log('💨 Inventory dropdown blurred')}
                  className="border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white cursor-pointer"
                  style={{ 
                    pointerEvents: 'auto !important',
                    zIndex: 1003,
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    border: '2px solid #d1d5db',
                    appearance: 'none'
                  }}
                >
                  <option value="all">All Units</option>
                  <option value="kg">Kilograms</option>
                  <option value="tons">Tons</option>
                  <option value="units">Units</option>
                </select>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🟢 Add Item button clicked!');
                  setShowAddModal(true);
                }}
                className="text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center cursor-pointer shadow-lg font-medium"
                style={{ 
                  pointerEvents: 'auto !important',
                  zIndex: 1003,
                  position: 'relative',
                  backgroundColor: '#059669',
                  border: 'none',
                  borderRadius: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Item
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Package2 className="h-8 w-8 text-green-600 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                                <div className="text-sm text-gray-500">{item.description || 'No description'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedInventoryItem(item);
                                  setShowEditModal(true);
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteInventoryItem(item._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <Package2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No inventory items found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0" style={{ position: 'relative', zIndex: 1000 }}>
              <div className="flex items-center space-x-4" style={{ position: 'relative', zIndex: 1001 }}>
                <select
                  value={deliveryFilter}
                  onChange={(e) => {
                    console.log('🚚 Delivery filter changed:', e.target.value);
                    setDeliveryFilter(e.target.value);
                  }}
                  onClick={(e) => {
                    console.log('🖱️ Delivery dropdown clicked!');
                    e.stopPropagation();
                  }}
                  onFocus={() => console.log('🎯 Delivery dropdown focused')}
                  onBlur={() => console.log('💨 Delivery dropdown blurred')}
                  className="border-2 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
                  style={{ 
                    pointerEvents: 'auto !important',
                    zIndex: 1003,
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    border: '2px solid #d1d5db',
                    appearance: 'none'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔵 Request Delivery button clicked!');
                  setShowDeliveryModal(true);
                }}
                className="text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center cursor-pointer shadow-lg font-medium"
                style={{ 
                  pointerEvents: 'auto !important',
                  zIndex: 1003,
                  position: 'relative',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                <Send className="h-5 w-5 mr-2" />
                Request Delivery
              </button>
            </div>

            <div className="grid gap-6">
              {filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((delivery, index) => (
                  <div key={index} className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Truck className="h-8 w-8 text-blue-600" />
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{delivery.goodsDescription || delivery.itemName}</h4>
                          <p className="text-sm text-gray-500">Quantity: {delivery.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          delivery.status === 'in-transit' || delivery.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                          delivery.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {delivery.status === 'in_transit' ? 'In Transit' : 
                           delivery.status === 'delivered' ? 'Delivered' :
                           delivery.status === 'assigned' ? 'Assigned' : 
                           delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                        </span>
                        {delivery.status === 'delivered' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                // Show detailed delivery completion info with inventory transfer
                                alert(`✅ Delivery Completed Successfully!\n\n📦 Items: ${delivery.goodsDescription || delivery.itemName} (${delivery.quantity} units)\n\n🔄 Inventory Transfer:\n🌾 Your inventory: Items automatically removed\n🏦 Warehouse inventory: Items automatically added\n\n📧 All parties have been notified of the completion.\n\n🎉 Thank you for using AgriSync!`);
                              }}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition flex items-center"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              View Details
                            </button>
                          </div>
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
                        <p className="font-medium">{delivery.dropoffLocation || delivery.destination || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-medium">{new Date(delivery.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Priority</p>
                        <p className="font-medium">{delivery.urgency || 'Normal'}</p>
                      </div>
                    </div>
                    {delivery.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{delivery.notes}</p>
                      </div>
                    )}
                    {delivery.status === 'delivered' && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h5 className="font-medium text-green-800">Inventory Transfer Completed</h5>
                        </div>
                        <div className="space-y-2 text-sm text-green-700">
                          <p className="flex items-center space-x-2">
                            <span className="font-medium">🌾 Your farm inventory:</span>
                            <span>Items automatically removed from your stock</span>
                          </p>
                          <p className="flex items-center space-x-2">
                            <span className="font-medium">🏦 Warehouse inventory:</span>
                            <span>Items automatically added to warehouse</span>
                          </p>
                          <p className="flex items-center space-x-2">
                            <span className="font-medium">📧 Notifications:</span>
                            <span>All parties have been notified</span>
                          </p>
                        </div>
                        <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-600">
                          💡 Inventory transfer was handled automatically when the transporter marked this delivery as completed.
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-xl shadow-sm border text-center">
                  <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No deliveries found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Export Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Analytics & Reports</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={exportInventoryData}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center relative z-10 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Inventory
                  </button>
                  <button
                    onClick={exportDeliveryData}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center relative z-10 cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Deliveries
                  </button>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Financial Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Total Inventory Value</p>
                      <p className="text-2xl font-bold text-green-900">
                        ₹{safeInventory.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Average Price per Kg</p>
                      <p className="text-2xl font-bold text-blue-900">
                        ₹{safeInventory.length > 0 ? (safeInventory.reduce((sum, item) => sum + (item.price || 0), 0) / safeInventory.length).toFixed(2) : '0'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Total Products</p>
                      <p className="text-2xl font-bold text-purple-900">{safeInventory.length}</p>
                    </div>
                    <Package2 className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2 text-orange-600" />
                Crop Category Analysis
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(
                          safeInventory.reduce((acc, item) => {
                            acc[item.category || 'other'] = (acc[item.category || 'other'] || 0) + parseInt(item.quantity || 0);
                            return acc;
                          }, {})
                        ).map(([category, quantity]) => ({
                          name: category.charAt(0).toUpperCase() + category.slice(1),
                          value: quantity,
                          fill: COLORS[Object.keys(
                            safeInventory.reduce((acc, item) => {
                              acc[item.category || 'other'] = true;
                              return acc;
                            }, {})
                          ).indexOf(category) % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(
                          safeInventory.reduce((acc, item) => {
                            acc[item.category || 'other'] = true;
                            return acc;
                          }, {})
                        ).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {Object.entries(
                    safeInventory.reduce((acc, item) => {
                      const cat = item.category || 'other';
                      acc[cat] = {
                        quantity: (acc[cat]?.quantity || 0) + parseInt(item.quantity || 0),
                        value: (acc[cat]?.value || 0) + ((item.price || 0) * (item.quantity || 0)),
                        count: (acc[cat]?.count || 0) + 1
                      };
                      return acc;
                    }, {})
                  ).map(([category, data]) => (
                    <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{category.charAt(0).toUpperCase() + category.slice(1)}</p>
                        <p className="text-xs text-gray-500">{data.count} items • {data.quantity} units</p>
                      </div>
                      <p className="text-sm font-bold text-gray-700">₹{data.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Transporter Location Map */}
            <div className="mb-8">
              <TransporterMap 
                farmerLocation={user?.location ? [19.0760, 72.8777] : null} 
                deliveries={deliveries}
                showAllTransporters={false}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Inventory Trends */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  Inventory Trends
                </h3>
                {inventoryTrends && inventoryTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={inventoryTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No trend data available yet</p>
                      <p className="text-sm text-gray-400">Data will appear as you add more inventory</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-blue-600" />
                  Performance Metrics
                </h3>
                <div className="space-y-4">
                  {performanceMetrics ? (
                    <>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-green-800">Storage Efficiency</span>
                        <span className="text-lg font-bold text-green-600">{performanceMetrics.storageEfficiency}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">Delivery Success Rate</span>
                        <span className="text-lg font-bold text-blue-600">{performanceMetrics.deliverySuccessRate}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm font-medium text-purple-800">Average Response Time</span>
                        <span className="text-lg font-bold text-purple-600">{performanceMetrics.averageResponseTime} hrs</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-green-800">Delivery Success Rate</span>
                        <span className="text-lg font-bold text-green-600">{generateAnalytics().deliverySuccessRate}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">Average Quantity per Item</span>
                        <span className="text-lg font-bold text-blue-600">{generateAnalytics().averageQuantityPerItem} units</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm font-medium text-purple-800">Recent Activities</span>
                        <span className="text-lg font-bold text-purple-600">{generateAnalytics().recentActivities}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quality Analysis */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-600" />
                Quality Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['Premium', 'A', 'B', 'C', 'Standard'].map((grade) => {
                  const count = safeInventory.filter(item => item.qualityGrade === grade).length;
                  const percentage = safeInventory.length > 0 ? ((count / safeInventory.length) * 100).toFixed(1) : 0;
                  return (
                    <div key={grade} className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                      <div className={`text-2xl font-bold ${
                        grade === 'Premium' ? 'text-yellow-600' :
                        grade === 'A' ? 'text-green-600' :
                        grade === 'B' ? 'text-blue-600' :
                        grade === 'C' ? 'text-orange-600' : 'text-gray-600'
                      }`}>{count}</div>
                      <div className="text-sm font-medium text-gray-700">Grade {grade}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Inventory Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} className="max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Add Inventory Item</h3>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
                
          <form onSubmit={(e) => { e.preventDefault(); addInventoryItem(); }} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
              <input
                type="text"
                value={newInventoryItem.itemName}
                onChange={(e) => setNewInventoryItem({...newInventoryItem, itemName: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
                placeholder="Enter item name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select
                value={newInventoryItem.category}
                onChange={(e) => setNewInventoryItem({...newInventoryItem, category: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
              >
                <option value="grains">Grains</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="dairy">Dairy</option>
                <option value="meat">Meat</option>
                <option value="seeds">Seeds</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={newInventoryItem.quantity}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, quantity: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
                  placeholder="0"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                <select
                  value={newInventoryItem.unit}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, unit: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
                >
                  <option value="kg">Kilograms</option>
                  <option value="tons">Tons</option>
                  <option value="bags">Bags</option>
                  <option value="units">Units</option>
                  <option value="liters">Liters</option>
                  <option value="pieces">Pieces</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price per Unit (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInventoryItem.price}
                  onChange={(e) => setNewInventoryItem({...newInventoryItem, price: e.target.value})}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
                  placeholder="0.00"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Total Amount (₹)</label>
                <div className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-700 font-medium">
                  ₹{((parseFloat(newInventoryItem.quantity) || 0) * (parseFloat(newInventoryItem.price) || 0)).toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Auto-calculated: Quantity × Price per Unit</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Add Item
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Inventory Modal */}
      <Modal 
        open={showEditModal && selectedInventoryItem} 
        onClose={() => { setShowEditModal(false); setSelectedInventoryItem(null); }} 
        className="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">✏️ Edit Inventory Item</h3>
            <button
              onClick={() => { setShowEditModal(false); setSelectedInventoryItem(null); }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
                
                {selectedInventoryItem ? (
                <form onSubmit={(e) => { e.preventDefault(); updateInventoryItem(); }} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                    <input
                      type="text"
                      value={selectedInventoryItem.itemName || ''}
                      onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, itemName: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white/80 backdrop-blur-sm"
                      placeholder="Enter item name"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <input
                        type="number"
                        value={selectedInventoryItem.quantity || ''}
                        onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, quantity: e.target.value})}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white/80 backdrop-blur-sm"
                        placeholder="0"
                        min="1"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                      <select
                        value={selectedInventoryItem.unit || 'units'}
                        onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, unit: e.target.value})}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white/80 backdrop-blur-sm"
                      >
                        <option value="kg">Kilograms</option>
                        <option value="tons">Tons</option>
                        <option value="bags">Bags</option>
                        <option value="units">Units</option>
                        <option value="liters">Liters</option>
                        <option value="pieces">Pieces</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">📍 Storage Location</label>
                    <input
                      type="text"
                      value={selectedInventoryItem.location || ''}
                      onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, location: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white/80 backdrop-blur-sm"
                      placeholder="Enter storage location"
                      required
                    />
                  </div>
                  
                  {selectedInventoryItem.price && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">💰 Price per Unit (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedInventoryItem.price || ''}
                        onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, price: e.target.value})}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white/80 backdrop-blur-sm"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => { setShowEditModal(false); setSelectedInventoryItem(null); }}
                      className="px-6 py-3 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      💾 Update Item
                    </button>
                  </div>
                </form>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading item details...</p>
                  </div>
                )}
        </div>
      </Modal>

      {/* Request Delivery Modal */}
      <Modal open={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} className="max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Request Delivery</h3>
            <button
              onClick={() => setShowDeliveryModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); requestDelivery(); }} className="space-y-5">
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Item from Inventory</label>
              <select
                value={deliveryRequest.itemName}
                onChange={(e) => {
                  const selectedItem = safeInventory.find(item => item && item.itemName === e.target.value);
                  setDeliveryRequest({
                    ...deliveryRequest, 
                    itemName: e.target.value,
                    quantity: selectedItem ? selectedItem.quantity : '',
                    maxQuantity: selectedItem ? selectedItem.quantity : 0,
                    unit: selectedItem ? selectedItem.unit : 'units'
                  });
                }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm"
                required
              >
                <option value="">Select an item from your inventory</option>
                {safeInventory.map((item, index) => (
                  <option key={index} value={item.itemName}>
                    {item.itemName} ({item.quantity} {item.unit} available)
                  </option>
                ))}
              </select>
              {deliveryRequest.itemName && (
                <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-3 py-1 rounded-lg">
                  📦 Available: {safeInventory.find(item => item && item.itemName === deliveryRequest.itemName)?.quantity || 0} {safeInventory.find(item => item && item.itemName === deliveryRequest.itemName)?.unit || 'units'}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={deliveryRequest.quantity}
                onChange={(e) => setDeliveryRequest({...deliveryRequest, quantity: e.target.value})}
                max={deliveryRequest.maxQuantity || 1000}
                min="1"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={deliveryRequest.maxQuantity ? `Max: ${deliveryRequest.maxQuantity}` : "Enter quantity"}
                required
                disabled={!deliveryRequest.itemName}
              />
              {deliveryRequest.maxQuantity && deliveryRequest.quantity > deliveryRequest.maxQuantity && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 px-3 py-1 rounded-lg">
                  ⚠️ Quantity cannot exceed available stock ({deliveryRequest.maxQuantity})
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
              <select
                value={deliveryRequest.urgency}
                onChange={(e) => setDeliveryRequest({...deliveryRequest, urgency: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm"
              >
                <option value="low">🟢 Low Priority</option>
                <option value="normal">🔵 Normal Priority</option>
                <option value="high">🟡 High Priority</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                value={deliveryRequest.notes}
                onChange={(e) => setDeliveryRequest({...deliveryRequest, notes: e.target.value})}
                rows="3"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm resize-none"
                placeholder="Any special instructions for delivery..."
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="px-6 py-3 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                🚚 Request Delivery
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Notification Modal */}
      <Modal open={showNotificationModal} onClose={() => setShowNotificationModal(false)} className="max-w-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center">
              <Bell className="h-6 w-6 mr-2 text-blue-600" />
              Notifications
            </h3>
            <button
              onClick={() => setShowNotificationModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Notification Stats */}
          {notifications.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-xl border border-blue-200 text-center">
                <div className="text-lg font-bold text-blue-600">{notifications.length}</div>
                <div className="text-xs text-blue-700">Total</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200 text-center">
                <div className="text-lg font-bold text-green-600">{notifications.filter(n => n.type === 'success').length}</div>
                <div className="text-xs text-green-700">Success</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-pink-50 p-3 rounded-xl border border-red-200 text-center">
                <div className="text-lg font-bold text-red-600">{notifications.filter(n => n.type === 'error').length}</div>
                <div className="text-xs text-red-700">Errors</div>
              </div>
            </div>
          )}
          
          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      notification.type === 'success' ? 'bg-green-50 border-green-200 hover:bg-green-100' :
                      notification.type === 'error' ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                      notification.type === 'info' ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' :
                      'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0 mt-0.5">
                          {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                          {notification.type === 'info' && <Bell className="h-5 w-5 text-blue-600" />}
                          {!notification.type && <Bell className="h-5 w-5 text-gray-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-semibold mb-1 ${
                            notification.type === 'success' ? 'text-green-800' :
                            notification.type === 'error' ? 'text-red-800' :
                            notification.type === 'info' ? 'text-blue-800' :
                            'text-gray-800'
                          }`}>
                            {notification.title || 'Notification'}
                          </h4>
                          <p className={`text-sm leading-relaxed ${
                            notification.type === 'success' ? 'text-green-700' :
                            notification.type === 'error' ? 'text-red-700' :
                            notification.type === 'info' ? 'text-blue-700' :
                            'text-gray-700'
                          }`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{new Date(notification.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="ml-3 p-1 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-white/50"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-10 w-10 text-blue-500" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h4>
                <p className="text-gray-500 text-sm">You're all caught up! New notifications will appear here.</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {notifications.length > 0 && (
            <div className="flex justify-between items-center space-x-3 pt-6 border-t border-gray-200 mt-6">
              <div className="text-sm text-gray-500">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Close
                </button>
                <button
                  onClick={markAllNotificationsRead}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark All Read
                </button>
              </div>
            </div>
          )}
          
          {notifications.length === 0 && (
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Profile Modal */}
      <Modal open={showProfileModal} onClose={() => setShowProfileModal(false)} className="max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">👤 Profile</h3>
            <button
              onClick={() => setShowProfileModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
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
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <User className="h-8 w-8 text-white" />
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
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Email Address</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{user?.email}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Location</span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{user?.location || 'Not specified'}</p>
              </div>
              
              {user?.phone && (
                <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Phone className="h-4 w-4 text-gray-500" />
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
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal open={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} className="max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">✏️ Edit Profile</h3>
            <button
              onClick={() => setShowEditProfileModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {profileError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <User className="h-8 w-8 text-white" />
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
                    className="flex items-center px-3 py-2 bg-green-50 text-green-700 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-all text-sm font-medium"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Photo
                  </button>
                  {(profileImagePreview || user?.profilePhoto) && (
                    <button
                      type="button"
                      onClick={removeProfileImage}
                      className="flex items-center px-3 py-2 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-all text-sm font-medium"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
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
                <MapPin className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                  placeholder={user?.location || 'Enter your location'}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-10 pr-16 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-green-600 hover:text-green-800 transition-colors rounded-lg hover:bg-green-50"
                  title="Pick location on map"
                >
                  <MapPin className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  placeholder={user?.phone || 'Enter your phone number'}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
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
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})}
                    placeholder="Enter new password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm"
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
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <button
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGettingLocation ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
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
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Selected coordinates:</strong> {selectedCoordinates[0].toFixed(6)}, {selectedCoordinates[1].toFixed(6)}
                    </p>
                    {profileForm.location && (
                      <p className="text-sm text-green-700 mt-1">
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
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Use This Location
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FarmerDashboard;
