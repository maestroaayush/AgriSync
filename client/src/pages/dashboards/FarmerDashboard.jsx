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
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Form states
  const [newInventoryItem, setNewInventoryItem] = useState({
    itemName: '',
    category: 'other',
    quantity: '',
    unit: 'kg',
    location: '',
    price: '',
    qualityGrade: 'Standard',
    qualityCertification: '',
    description: '',
    harvestDate: '',
    expiryDate: ''
  });
  const [deliveryRequest, setDeliveryRequest] = useState({
    destination: '',
    itemName: '',
    quantity: '',
    urgency: 'normal',
    notes: ''
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
    try {
      await axios.post("http://localhost:5000/api/inventory", newInventoryItem, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowAddModal(false);
      setNewInventoryItem({
        itemName: '',
        category: 'other',
        quantity: '',
        unit: 'kg',
        location: '',
        price: '',
        qualityGrade: 'Standard',
        qualityCertification: '',
        description: '',
        harvestDate: '',
        expiryDate: ''
      });
      fetchInventory();
      fetchLogs();
    } catch (err) {
      console.error("Failed to add inventory item", err);
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
    try {
      await axios.post("http://localhost:5000/api/deliveries", {
        ...deliveryRequest,
        status: 'pending',
        requestedBy: user._id
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowDeliveryModal(false);
      setDeliveryRequest({
        destination: '',
        itemName: '',
        quantity: '',
        urgency: 'normal',
        notes: ''
      });
      fetchDeliveries();
    } catch (err) {
      console.error("Failed to request delivery", err);
    }
  };

  useEffect(() => {
    document.title = "Farmer Dashboard  AgriSync";
    console.log('FarmerDashboard useEffect - user:', user);

    // Redirect to login if no user
    if (!user) {
      console.log('No user found, redirecting to login');
      navigate("/login");
      return;
    }

    // Redirect if role is not farmer
    if (user.role !== "farmer") {
      console.log(`User role is ${user.role}, redirecting to appropriate dashboard`);
      navigate(`/${user.role}/dashboard`);
      return;
    }

    console.log('User is farmer, loading dashboard data');
    
    // Load dashboard data
    loadAllData();
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
    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
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

  // Export data functions
  const exportInventoryData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Item Name,Quantity,Unit,Location,Description"]
        .concat(inventory.map(item => 
          `${item.itemName},${item.quantity},${item.unit},${item.location},${item.description || ''}`
        ))
        .join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDeliveryData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Item,Quantity,Status,From,To,Date,Priority"]
        .concat(deliveries.map(delivery => 
          `${delivery.goodsDescription || delivery.itemName},${delivery.quantity},${delivery.status},${delivery.pickupLocation || 'N/A'},${delivery.dropoffLocation || delivery.destination || 'N/A'},${new Date(delivery.createdAt).toLocaleDateString()},${delivery.urgency || 'Normal'}`
        ))
        .join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `deliveries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
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
    const lowStockItems = inventory.filter(item => parseInt(item.quantity) < 10).length;
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

  // Profile management
  const updateProfile = async (profileData) => {
    try {
      await axios.put('http://localhost:5000/api/users/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update local storage
      const updatedUser = { ...user, ...profileData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowProfileModal(false);
    } catch (err) {
      console.error('Failed to update profile', err);
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

  const totalStored = inventory.reduce((acc, item) => acc + item.quantity, 0);
  const capacityUsed = warehouse ? ((totalStored / warehouse.capacityLimit) * 100).toFixed(1) : 0;
  
  // Prepare chart data
  const inventoryChartData = inventory.map((item, index) => ({
    name: item.itemName,
    value: item.quantity,
    fill: COLORS[index % COLORS.length]
  }));

  const deliveryStatusData = [
    { name: 'Pending', value: deliveries.filter(d => d.status === 'pending').length, fill: '#F59E0B' },
    { name: 'In Transit', value: deliveries.filter(d => d.status === 'in-transit').length, fill: '#60A5FA' },
    { name: 'Delivered', value: deliveries.filter(d => d.status === 'delivered').length, fill: '#34D399' }
  ];

  const filteredInventory = inventory.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (inventoryFilter === 'all' || item.unit === inventoryFilter)
  );

  const filteredDeliveries = deliveries.filter(delivery => 
    (deliveryFilter === 'all' || delivery.status === deliveryFilter)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-emerald-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-200/30 to-cyan-300/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-100/20 to-blue-100/20 rounded-full blur-3xl"></div>
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
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-3 py-2 cursor-pointer hover:bg-white/70 transition-all duration-200 shadow-sm" onClick={() => setShowProfileModal(true)}>
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
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
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 relative z-10">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2">
            <nav className="flex space-x-2">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3, color: 'emerald' },
                { id: 'inventory', label: 'Inventory', icon: Package2, color: 'blue' },
                { id: 'deliveries', label: 'Deliveries', icon: Truck, color: 'purple' },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'orange' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 transform ${
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
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Units</option>
                  <option value="kg">Kilograms</option>
                  <option value="tons">Tons</option>
                  <option value="units">Units</option>
                </select>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center"
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
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <button
                onClick={() => setShowDeliveryModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
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
                          delivery.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {delivery.status}
                        </span>
                        {delivery.status === 'delivered' && (
                          <button
                            onClick={() => confirmDelivery(delivery)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                          >
                            Confirm
                          </button>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
{/* Inventory Trends */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={inventoryTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

{/* Performance Metrics */}
              <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  {performanceMetrics && (
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
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Inventory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Inventory Item</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addInventoryItem(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={newInventoryItem.itemName}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, itemName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newInventoryItem.category}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newInventoryItem.quantity}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, quantity: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={newInventoryItem.unit}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, unit: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="kg">Kilograms</option>
                    <option value="tons">Tons</option>
                    <option value="bags">Bags</option>
                    <option value="units">Units</option>
                    <option value="liters">Liters</option>
                    <option value="pieces">Pieces</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newInventoryItem.location}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, location: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newInventoryItem.price}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, price: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quality Grade</label>
                  <select
                    value={newInventoryItem.qualityGrade}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, qualityGrade: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="Premium">Premium</option>
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quality Certification (Optional)</label>
                  <input
                    type="text"
                    value={newInventoryItem.qualityCertification}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, qualityCertification: e.target.value})}
                    placeholder="e.g., Organic Certified, FSSAI approved"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harvest Date (Optional)</label>
                    <input
                      type="date"
                      value={newInventoryItem.harvestDate}
                      onChange={(e) => setNewInventoryItem({...newInventoryItem, harvestDate: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      value={newInventoryItem.expiryDate}
                      onChange={(e) => setNewInventoryItem({...newInventoryItem, expiryDate: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={newInventoryItem.description}
                    onChange={(e) => setNewInventoryItem({...newInventoryItem, description: e.target.value})}
                    rows="3"
                    placeholder="Additional notes about the product..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inventory Modal */}
      {showEditModal && selectedInventoryItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Inventory Item</h3>
                <button
                  onClick={() => { setShowEditModal(false); setSelectedInventoryItem(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); updateInventoryItem(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={selectedInventoryItem.itemName}
                    onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, itemName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={selectedInventoryItem.quantity}
                    onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, quantity: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={selectedInventoryItem.unit}
                    onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, unit: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="kg">Kilograms</option>
                    <option value="tons">Tons</option>
                    <option value="units">Units</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={selectedInventoryItem.location}
                    onChange={(e) => setSelectedInventoryItem({...selectedInventoryItem, location: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setSelectedInventoryItem(null); }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Update Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Request Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Request Delivery</h3>
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); requestDelivery(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <input
                    type="text"
                    value={deliveryRequest.destination}
                    onChange={(e) => setDeliveryRequest({...deliveryRequest, destination: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={deliveryRequest.itemName}
                    onChange={(e) => setDeliveryRequest({...deliveryRequest, itemName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={deliveryRequest.quantity}
                    onChange={(e) => setDeliveryRequest({...deliveryRequest, quantity: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={deliveryRequest.urgency}
                    onChange={(e) => setDeliveryRequest({...deliveryRequest, urgency: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={deliveryRequest.notes}
                    onChange={(e) => setDeliveryRequest({...deliveryRequest, notes: e.target.value})}
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeliveryModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Request Delivery
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

export default FarmerDashboard;
