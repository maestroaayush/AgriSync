import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../../components/Modal";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from "recharts";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Plus,
  Download,
  Eye,
  Edit3,
  Trash2,
  Check,
  X,
  Filter,
  Search,
  Bell,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Zap,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Store,
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
  Calendar as CalendarIcon,
  FileText,
  BarChart2,
  TrendingDown,
  Target,
  Globe,
  Layers,
  Database,
  MonitorSpeaker,
  ShoppingBag,
  Truck,
  CreditCard
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function VendorDashboard() {
  // Core data states
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [marketData, setMarketData] = useState(null);
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orderTrends, setOrderTrends] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [selectedDeliveryTracking, setSelectedDeliveryTracking] = useState(null);
  
  // New vendor-specific states
  const [expectedDeliveries, setExpectedDeliveries] = useState([]);
  const [marketInventory, setMarketInventory] = useState([]);
  const [bestSellingItems, setBestSellingItems] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [productAvailability, setProductAvailability] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Modal states
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showMarketInventoryModal, setShowMarketInventoryModal] = useState(false);
  const [showStockAlertModal, setShowStockAlertModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  
  // Map states
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]); // Default to Mumbai
  
  // Transporter tracking functions
  const fetchActiveDeliveries = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/deliveries/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveDeliveries(res.data);
    } catch (err) {
      console.error("Failed to fetch active deliveries", err);
    }
  };

  const handleTrackDelivery = (deliveryId) => {
    const delivery = activeDeliveries.find(d => d._id === deliveryId);
    if (delivery) {
      setSelectedDeliveryTracking(delivery);
      setMapCenter([delivery.currentLocation.lat, delivery.currentLocation.lng]);
      setShowTrackingMap(true);
    }
  };

  const handleCloseTracking = () => {
    setShowTrackingMap(false);
    setSelectedDeliveryTracking(null);
  };
  
  // Form states
  const [form, setForm] = useState({ 
    itemName: "", 
    quantity: 1,
    urgency: 'normal',
    destination: '',
    notes: ''
  });
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [orderFilter, setOrderFilter] = useState('all');
  const [selectedRole, setSelectedRole] = useState("market_vendor");
  
  // Profile management states
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    businessType: 'retail',
    businessName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/inventory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(res.data);
    } catch (err) {
      console.error("Failed to load inventory", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Notification fetch failed", err);
    }
  };

  // Vendor-specific data fetching functions
  const fetchExpectedDeliveries = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/deliveries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter deliveries expected to arrive at vendor location
      const vendorDeliveries = res.data.filter(delivery => 
        delivery.dropoffLocation === user?.location || 
        delivery.destination === user?.location
      );
      setExpectedDeliveries(vendorDeliveries);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn("Expected deliveries endpoint not found. Using fallback.");
        setExpectedDeliveries([]);
      } else {
        console.error("Failed to fetch expected deliveries", err);
        setExpectedDeliveries([]);
      }
    }
  };

  const fetchMarketInventory = async () => {
    try {
      // Try vendor-specific inventory first, fallback to general inventory
      let res;
      try {
        res = await axios.get("http://localhost:5000/api/vendor/market-inventory", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (vendorErr) {
        if (vendorErr.response?.status === 404) {
          // Fallback to general inventory filtered by location
          res = await axios.get(`http://localhost:5000/api/inventory/location/${user?.location}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          throw vendorErr;
        }
      }
      setMarketInventory(res.data || []);
    } catch (err) {
      console.error("Failed to fetch market inventory", err);
      setMarketInventory([]);
    }
  };

  const fetchBestSellingItems = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/vendor/best-selling", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBestSellingItems(res.data || []);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn("Best-selling items endpoint not found. Feature not available.");
        setBestSellingItems([]);
      } else {
        console.error("Failed to fetch best-selling items", err);
        setBestSellingItems([]);
      }
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/vendor/stock-alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStockAlerts(res.data || []);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn("Stock alerts endpoint not found. Feature not available.");
        setStockAlerts([]);
      } else {
        console.error("Failed to fetch stock alerts", err);
        setStockAlerts([]);
      }
    }
  };

  // Confirm delivery arrival
  const confirmDeliveryArrival = async (deliveryId, qualityNotes = '', storageLocation = '') => {
    try {
      await axios.put(`http://localhost:5000/api/vendor/confirm-delivery/${deliveryId}`, {
        qualityNotes,
        storageLocation
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchExpectedDeliveries();
      fetchNotifications();
    } catch (err) {
      console.error("Failed to confirm delivery", err);
    }
  };

  // Update market inventory
  const updateMarketInventory = async (itemId, updates) => {
    try {
      await axios.put(`http://localhost:5000/api/vendor/market-inventory/${itemId}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMarketInventory();
    } catch (err) {
      console.error("Failed to update market inventory", err);
    }
  };

  // Configure stock alert
  const configureStockAlert = async (itemName, minThreshold, alertEnabled) => {
    try {
      await axios.post('http://localhost:5000/api/vendor/stock-alert', {
        itemName,
        minThreshold,
        alertEnabled
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchStockAlerts();
    } catch (err) {
      console.error("Failed to configure stock alert", err);
    }
  };

  useEffect(() => {
    document.title = "Vendor Dashboard – AgriSync";
    if (user?.role !== "market_vendor") {
      navigate(`/${user?.role || "login"}/dashboard`);
      return;
    }
    
    // Fetch all data on component mount
    fetchOrders();
    fetchInventory();
    fetchNotifications();
    fetchExpectedDeliveries();
    fetchMarketInventory();
    fetchBestSellingItems();
    fetchStockAlerts();
    
    // Set up polling for real-time updates
    const notificationInterval = setInterval(fetchNotifications, 5000);
    const deliveryInterval = setInterval(fetchExpectedDeliveries, 30000); // Update every 30 seconds
    
    return () => {
      clearInterval(notificationInterval);
      clearInterval(deliveryInterval);
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/orders", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowOrderModal(false);
      setForm({ itemName: "", quantity: 1 });
      fetchOrders();
    } catch (err) {
      console.error("Failed to place order", err);
    }
  };

  const switchRole = (newRole) => {
    navigate(`/${newRole}/dashboard`);
  };

  const orderSummary = orders.reduce((acc, order) => {
    acc[order.itemName] = (acc[order.itemName] || 0) + order.quantity;
    return acc;
  }, {});

  // Calculate order statistics
  const orderStats = {
    total: (orders || []).length,
    pending: (orders || []).filter(order => order.status === 'pending').length,
    completed: (orders || []).filter(order => order.status === 'completed').length,
    canceled: (orders || []).filter(order => order.status === 'canceled').length,
    totalQuantity: (orders || []).reduce((sum, order) => sum + (order.quantity || 0), 0)
  };

  // Get order status distribution for charts
  const statusDistribution = [
    { name: 'Pending', value: orderStats.pending, color: '#F59E0B' },
    { name: 'Completed', value: orderStats.completed, color: '#34D399' },
    { name: 'Canceled', value: orderStats.canceled, color: '#F472B6' }
  ].filter(item => item.value > 0);

  // Profile picture functions
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setProfileError('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setProfileError('Please select a valid image file');
        return;
      }
      
      setProfileError(''); // Clear any previous errors
      
      try {
        // Compress the image before processing
        const compressedFile = await compressImage(file, 800, 0.7);
        setProfileImageFile(compressedFile);
        
        // Create preview from compressed file
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfileImagePreview(e.target.result);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Error compressing image:', error);
        setProfileError('Error processing image. Please try another image.');
      }
    }
  };

  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Profile management functions
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
      
      // Add profile photo if selected
      if (profileImageFile) {
        updateData.profilePhoto = await convertToBase64(profileImageFile);
      }
      
      const response = await axios.put('http://localhost:5000/api/auth/profile', updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local storage with new user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Reset form and image states
      setProfileForm({
        name: '',
        email: '',
        phone: '',
        location: '',
        businessType: 'retail',
        businessName: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setProfileImagePreview(null);
      setProfileImageFile(null);
      
      setShowEditProfileModal(false);
      alert('Profile updated successfully!');
      
      // Refresh the page to show updated profile picture
      window.location.reload();
    } catch (err) {
      console.error('Failed to update profile', err);
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };
  
  const openEditProfile = () => {
    setProfileForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.location || '',
      businessType: user.businessType || 'retail',
      businessName: user.businessName || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setProfileError('');
    setShowProfileModal(false);
    setShowEditProfileModal(true);
  };

  // Generate simulated market trend data if none exists yet
  useEffect(() => {
    if (!revenueData.length) {
      // Simulate revenue data for last 7 days
      const simulatedRevenue = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}),
          revenue: Math.floor(Math.random() * 5000) + 2000,
          orders: Math.floor(Math.random() * 20) + 5
        };
      });
      setRevenueData(simulatedRevenue);
      
      // Simulate order trends for the year by month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const simulatedTrends = monthNames.map(month => ({
        month,
        orders: Math.floor(Math.random() * 100) + 20,
        revenue: Math.floor(Math.random() * 15000) + 5000
      }));
      setOrderTrends(simulatedTrends);
    }
  }, [revenueData.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/30 to-yellow-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-200/30 to-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-yellow-100/20 to-orange-100/20 rounded-full blur-3xl"></div>
      </div>
      
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">AgriSync</h1>
                  <p className="text-xs text-gray-500">Vendor Dashboard</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <Bell 
                  className="h-6 w-6 text-gray-600 cursor-pointer hover:text-amber-600 transition-colors duration-200" 
                  onClick={() => setShowNotifModal(true)} 
                />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-3 py-2 cursor-pointer hover:bg-white/70 transition-all duration-200 shadow-sm" onClick={() => setShowProfileModal(true)}>
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
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
                <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent mb-3">
                  Welcome back, {user?.name}! 🛒
                </h2>
                <p className="text-gray-600 text-lg">Managing your market operations and orders.</p>
                <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{user?.location || 'Market Location'}</span>
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
                    <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
                      <Store className="h-16 w-16 text-amber-600" />
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
                onChange={(e) => {
                  console.log('Mobile tab changed to:', e.target.value);
                  setActiveTab(e.target.value);
                }}
                className="w-full px-4 py-3 rounded-xl border-none bg-white/50 text-gray-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 pointer-events-auto cursor-pointer relative z-20"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 20 }}
              >
                <option value="overview">📊 Overview</option>
                <option value="orders">🛒 Orders</option>
                <option value="inventory">📦 Available Items</option>
                <option value="deliveries">🚛 Deliveries</option>
                <option value="market-inventory">🏪 Market Stock</option>
                <option value="analytics">📈 Analytics</option>
                <option value="stock-alerts">⚠️ Stock Alerts</option>
                <option value="reports">📄 Reports</option>
              </select>
            </div>
            
            {/* Desktop Tab Navigation - Responsive Grid */}
            <div className="hidden md:block">
              {/* Large screens - All tabs in one row */}
              <nav className="hidden xl:flex xl:space-x-2">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3, color: 'amber' },
                  { id: 'orders', label: 'Orders', icon: ShoppingCart, color: 'blue' },
                  { id: 'inventory', label: 'Available Items', icon: Package, color: 'green' },
                  { id: 'deliveries', label: 'Deliveries', icon: Truck, color: 'cyan' },
                  { id: 'market-inventory', label: 'Market Stock', icon: Store, color: 'emerald' },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'purple' },
                  { id: 'stock-alerts', label: 'Stock Alerts', icon: AlertTriangle, color: 'red' },
                  { id: 'reports', label: 'Reports', icon: FileText, color: 'indigo' }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 transform ${
                        isActive
                          ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg scale-105`
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-105'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
              
              {/* Medium/Large screens - Two rows */}
              <div className="xl:hidden space-y-2">
                {/* First row */}
                <nav className="flex space-x-2">
                  {[
                    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: BarChart3, color: 'amber' },
                    { id: 'orders', label: 'Orders', shortLabel: 'Orders', icon: ShoppingCart, color: 'blue' },
                    { id: 'inventory', label: 'Available Items', shortLabel: 'Items', icon: Package, color: 'green' },
                    { id: 'deliveries', label: 'Deliveries', shortLabel: 'Delivery', icon: Truck, color: 'cyan' }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 transform ${
                          isActive
                            ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg scale-105`
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-105'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-1.5" />
                        <span className="hidden lg:block">{tab.label}</span>
                        <span className="lg:hidden">{tab.shortLabel}</span>
                      </button>
                    );
                  })}
                </nav>
                
                {/* Second row */}
                <nav className="flex space-x-2">
                  {[
                    { id: 'market-inventory', label: 'Market Stock', shortLabel: 'Market', icon: Store, color: 'emerald' },
                    { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: TrendingUp, color: 'purple' },
                    { id: 'stock-alerts', label: 'Stock Alerts', shortLabel: 'Alerts', icon: AlertTriangle, color: 'red' },
                    { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: FileText, color: 'indigo' }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 transform ${
                          isActive
                            ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg scale-105`
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-105'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-1.5" />
                        <span className="hidden lg:block">{tab.label}</span>
                        <span className="lg:hidden">{tab.shortLabel}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
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
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{orderStats.total}</p>
                    <p className="text-sm text-green-600 font-medium">+{orderStats.pending} pending</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{orderStats.pending}</p>
                    <p className="text-sm text-blue-600 font-medium">{orderStats.completed} completed</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available Items</p>
                    <p className="text-3xl font-bold text-gray-900">{(inventory || []).length}</p>
                    <p className="text-sm text-green-600 font-medium">In stock</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                    <p className="text-3xl font-bold text-gray-900">{orderStats.totalQuantity}</p>
                    <p className="text-sm text-purple-600 font-medium">Units ordered</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Order Status Distribution */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-amber-600" />
                  Order Status Distribution
                </h3>
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No order data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Revenue Trends */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Revenue Trends (7 Days)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [name === 'revenue' ? `$${value}` : value, name === 'revenue' ? 'Revenue' : 'Orders']} />
                    <Area type="monotone" dataKey="revenue" stroke="#F59E0B" fill="#FEF3C7" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-lg hover:from-amber-100 hover:to-yellow-200 transition-all duration-200 group"
                >
                  <Plus className="h-8 w-8 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-amber-700">Place Order</span>
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
                >
                  <ShoppingCart className="h-8 w-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-blue-700">View Orders</span>
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
                  <span className="text-sm font-medium text-green-700">Export Reports</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white/70"
                  />
                </div>
                <select
                  value={orderFilter}
                  onChange={(e) => {
                    console.log('Order filter changed to:', e.target.value);
                    setOrderFilter(e.target.value);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white/70 pointer-events-auto cursor-pointer relative z-20"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 20 }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('New Order button clicked!');
                  setShowOrderModal(true);
                }}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-6 py-2 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition-all duration-200 flex items-center shadow-lg pointer-events-auto cursor-pointer relative z-30"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 30 }}
              >
                <Plus className="h-5 w-5 mr-2" />
                New Order
              </button>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/70">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-200">
                    {orders.length > 0 ? (
                      (orders || []).filter(Boolean)
                        .filter(order => 
                          order && order.itemName && order.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                          (orderFilter === 'all' || order.status === orderFilter)
                        )
                        .map((order, index) => (
                        <tr key={index} className="hover:bg-white/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ShoppingCart className="h-8 w-8 text-amber-600 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{order.itemName}</div>
                                <div className="text-sm text-gray-500">Order #{order._id?.slice(-8) || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.quantity} {order.unit || 'units'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'canceled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-900 transition-colors">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="text-green-600 hover:text-green-900 transition-colors">
                                <Edit3 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No orders found</p>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Place Your First Order button clicked!');
                              setShowOrderModal(true);
                            }}
                            className="mt-4 bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors pointer-events-auto cursor-pointer relative z-30"
                            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 30 }}
                          >
                            Place Your First Order
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Available Items Tab */}
        {activeTab === 'inventory' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Package className="h-6 w-6 mr-2 text-green-600" />
                Available Items to Order
              </h2>
              <p className="text-gray-600 mt-1">Browse available items from warehouses and farms</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {(inventory || []).filter(Boolean).filter(item => item && item.itemName).length > 0 ? (
                    (inventory || []).filter(Boolean).filter(item => item && item.itemName).map((item, index) => (
                      <tr key={index} className="hover:bg-white/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-8 w-8 text-green-600 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                              <div className="text-sm text-gray-500">{item.description || 'No description'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setForm({...form, itemName: item.itemName});
                              setShowOrderModal(true);
                            }}
                            className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-yellow-700 transition-all duration-200 flex items-center"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Order
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No items available</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-purple-600" />
                  Monthly Order Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={orderTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#A855F7" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Revenue Analytics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">Total Revenue (7 days)</span>
                    <span className="text-lg font-bold text-green-600">${revenueData.reduce((sum, day) => sum + day.revenue, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">Average Order Value</span>
                    <span className="text-lg font-bold text-blue-600">${Math.round(revenueData.reduce((sum, day) => sum + day.revenue, 0) / revenueData.reduce((sum, day) => sum + day.orders, 0))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">Orders This Week</span>
                    <span className="text-lg font-bold text-amber-600">{revenueData.reduce((sum, day) => sum + day.orders, 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <div className="space-y-6">
            {/* Expected Deliveries Section */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Truck className="h-6 w-6 mr-2 text-cyan-600" />
                  Expected Deliveries
                </h2>
                <p className="text-gray-600 mt-1">View and confirm incoming deliveries to your market</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/70">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-200">
                    {/* Simulated data - replace with real expectedDeliveries */}
                    {[
                      { id: 1, orderNumber: 'ORD001', items: 'Rice, Wheat', expectedDate: '2024-01-15', status: 'pending', transporter: 'FastDelivery Co.' },
                      { id: 2, orderNumber: 'ORD002', items: 'Tomatoes, Onions', expectedDate: '2024-01-16', status: 'in_transit', transporter: 'QuickTransport' },
                      { id: 3, orderNumber: 'ORD003', items: 'Apples, Oranges', expectedDate: '2024-01-17', status: 'delivered', transporter: 'ReliableLogistics' }
                    ].map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-white/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Truck className="h-8 w-8 text-cyan-600 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{delivery.orderNumber}</div>
                              <div className="text-sm text-gray-500">{delivery.items}</div>
                              <div className="text-xs text-gray-400">{delivery.transporter}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(delivery.expectedDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            delivery.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                            delivery.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {delivery.status === 'in_transit' && (
                              <button 
                                onClick={() => {
                                  setSelectedDelivery(delivery);
                                  setShowDeliveryModal(true);
                                }}
                                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded text-xs hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirm
                              </button>
                            )}
                            <button className="text-blue-600 hover:text-blue-900 transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Market Inventory Tab */}
        {activeTab === 'market-inventory' && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Store className="h-6 w-6 mr-2 text-emerald-600" />
                      Market Inventory
                    </h2>
                    <p className="text-gray-600 mt-1">Manage your market stock levels and product availability</p>
                  </div>
                  <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/70">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-200">
                    {/* Simulated market inventory data */}
                    {[
                      { id: 1, name: 'Rice (Basmati)', stock: 150, unit: 'kg', price: 80, status: 'available', threshold: 50 },
                      { id: 2, name: 'Wheat Flour', stock: 25, unit: 'kg', price: 45, status: 'low_stock', threshold: 30 },
                      { id: 3, name: 'Tomatoes', stock: 75, unit: 'kg', price: 60, status: 'available', threshold: 20 },
                      { id: 4, name: 'Onions', stock: 0, unit: 'kg', price: 40, status: 'out_of_stock', threshold: 15 }
                    ].map((item) => (
                      <tr key={item.id} className="hover:bg-white/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Store className="h-8 w-8 text-emerald-600 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">Alert threshold: {item.threshold} {item.unit}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.stock} {item.unit}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                item.stock === 0 ? 'bg-red-600' :
                                item.stock <= item.threshold ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}
                              style={{ width: `${Math.min((item.stock / (item.threshold * 3)) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{item.price}/{item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.status === 'available' ? 'bg-green-100 text-green-800' :
                            item.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => {
                                setSelectedInventoryItem(item);
                                setShowMarketInventoryModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900 transition-colors">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Stock Alerts Tab */}
        {activeTab === 'stock-alerts' && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <AlertTriangle className="h-6 w-6 mr-2 text-red-600" />
                      Stock Alerts & Thresholds
                    </h2>
                    <p className="text-gray-600 mt-1">Configure automatic notifications for low stock levels</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('New Alert button clicked!');
                      setShowStockAlertModal(true);
                    }}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center shadow-lg pointer-events-auto cursor-pointer relative z-30"
                    style={{ pointerEvents: 'auto', position: 'relative', zIndex: 30 }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Alert
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Active Alerts */}
                <div className="grid gap-4">
                  {[
                    { id: 1, item: 'Wheat Flour', currentStock: 25, threshold: 30, enabled: true, lastTriggered: '2024-01-14' },
                    { id: 2, item: 'Onions', currentStock: 0, threshold: 15, enabled: true, lastTriggered: '2024-01-13' },
                    { id: 3, item: 'Rice (Basmati)', currentStock: 150, threshold: 50, enabled: true, lastTriggered: null }
                  ].map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                      alert.currentStock === 0 ? 'bg-red-50 border-red-500' :
                      alert.currentStock <= alert.threshold ? 'bg-yellow-50 border-yellow-500' :
                      'bg-green-50 border-green-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">{alert.item}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              alert.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {alert.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Current Stock:</span>
                              <span className={`ml-2 font-semibold ${
                                alert.currentStock === 0 ? 'text-red-600' :
                                alert.currentStock <= alert.threshold ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>{alert.currentStock} units</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Alert Threshold:</span>
                              <span className="ml-2 font-semibold text-gray-900">{alert.threshold} units</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Last Alert:</span>
                              <span className="ml-2 text-gray-900">
                                {alert.lastTriggered ? new Date(alert.lastTriggered).toLocaleDateString() : 'Never'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900 transition-colors">
                            <Settings className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white/70" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <DatePicker 
                  selected={to} 
                  onChange={setTo} 
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white/70" 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a 
                href={buildUrl("http://localhost:5000/api/export/orders")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-lg hover:from-amber-100 hover:to-yellow-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-amber-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-amber-700">Orders (CSV)</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/orders/pdf")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-blue-700">Orders (PDF)</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/vendor/deliveries")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg hover:from-cyan-100 hover:to-cyan-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-cyan-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-cyan-700">Deliveries (CSV)</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/vendor/inventory")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg hover:from-emerald-100 hover:to-emerald-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-emerald-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-emerald-700">Market Inventory (CSV)</span>
                </div>
              </a>
              <a 
                href="http://localhost:5000/api/export/vendor-summary" 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-green-700">Summary (CSV)</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/vendor/stock-alerts")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-red-700">Stock Alerts (CSV)</span>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showOrderModal} onClose={() => setShowOrderModal(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-semibold">Place New Order</h2>
          <select
            name="itemName"
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required
          >
            <option value="" disabled>Select item</option>
            {(inventory || []).filter(Boolean).filter(inv => inv && inv.itemName).map((inv) => (
              <option key={inv._id || inv.itemName} value={inv.itemName}>
                {inv.itemName}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            placeholder="Quantity"
            className="w-full px-3 py-2 border rounded"
            required
            min={1}
          />
          <button
            type="submit"
            className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700"
          >
            Submit Order
          </button>
        </form>
      </Modal>

      <Modal isOpen={showNotifModal} onClose={() => setShowNotifModal(false)}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-yellow-800">Notifications</h2>
            <button
              onClick={async () => {
                await axios.put("http://localhost:5000/api/notifications/mark-read", {}, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setShowNotifModal(false);
                fetchNotifications();
              }}
              className="text-sm text-yellow-600 underline hover:text-yellow-800"
            >
              Mark All as Read
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {notifications.map((note) => (
                <li
                  key={note._id}
                  className={`p-3 rounded border ${
                    note.read ? "bg-gray-50 text-gray-600" : "bg-yellow-100 text-yellow-900"
                  }`}
                >
                  <div>{note.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(note.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* Transporter Tracking Map Modal */}
      <Modal isOpen={showTrackingMap} onClose={handleCloseTracking}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Truck className="h-5 w-5 mr-2 text-blue-600" />
                Track Delivery
              </h2>
              {selectedDeliveryTracking && (
                <p className="text-sm text-gray-600 mt-1">
                  Order #{selectedDeliveryTracking.orderId?.slice(-8) || 'N/A'} • {selectedDeliveryTracking.transporterName}
                </p>
              )}
            </div>
            <button
              onClick={handleCloseTracking}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-4 space-y-3">
            {selectedDeliveryTracking && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedDeliveryTracking.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                      selectedDeliveryTracking.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      selectedDeliveryTracking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedDeliveryTracking.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">ETA:</span>
                    <span className="ml-2 text-gray-900">
                      {selectedDeliveryTracking.estimatedArrival ? 
                        new Date(selectedDeliveryTracking.estimatedArrival).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Destination:</span>
                  <span className="ml-2 text-gray-900">{selectedDeliveryTracking.destination || user?.location || 'Your Market'}</span>
                </div>
              </>
            )}
          </div>

          <div className="h-96 bg-gray-200 rounded-lg overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              key={`${mapCenter[0]}-${mapCenter[1]}`}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {selectedDeliveryTracking && selectedDeliveryTracking.currentLocation && (
                <Marker 
                  position={[selectedDeliveryTracking.currentLocation.lat, selectedDeliveryTracking.currentLocation.lng]}
                >
                </Marker>
              )}
              {/* Vendor location marker */}
              <Marker position={[19.0760, 72.8777]}>
              </Marker>
            </MapContainer>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => fetchActiveDeliveries()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Location
            </button>
            <div className="text-xs text-gray-500">
              Last updated: {selectedDeliveryTracking?.lastUpdated ? 
                new Date(selectedDeliveryTracking.lastUpdated).toLocaleString() : 
                'Just now'
              }
            </div>
          </div>
        </div>
      </Modal>

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
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    {user?.profilePhoto ? (
                      <img 
                        src={user.profilePhoto} 
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{user?.name}</h4>
                    <p className="text-sm text-gray-500">{user?.role?.replace('_', ' ')}</p>
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
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center"
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
                {/* Profile Picture Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
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
                        <div className="w-full h-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                          <User className="h-8 w-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="profile-image-upload"
                      />
                      <label
                        htmlFor="profile-image-upload"
                        className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Choose Image
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="relative">
                    <MapPin className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                      placeholder={user?.location || 'Enter your location'}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                        placeholder="Confirm new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}

export default VendorDashboard;
