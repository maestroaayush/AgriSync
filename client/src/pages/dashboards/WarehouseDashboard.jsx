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
  Package,
  TrendingUp,
  Truck,
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
  Calendar as CalendarIcon,
  FileText,
  BarChart2,
  TrendingDown,
  Target,
  Globe,
  Layers,
  Database,
  MonitorSpeaker
} from "lucide-react";
import Modal from "../../components/Modal";
import AddInventoryModal from "../../components/AddInventoryModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";

function WarehouseDashboard() {
  // Core data states
  const [inventory, setInventory] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [warehouse, setWarehouse] = useState(null);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventoryTrends, setInventoryTrends] = useState([]);
  const [warehouseMetrics, setWarehouseMetrics] = useState(null);
  const [capacityTrends, setCapacityTrends] = useState([]);
  
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
  const [showReportsModal, setShowReportsModal] = useState(false);
  
  // Form states
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [newInventoryItem, setNewInventoryItem] = useState({
    itemName: '',
    quantity: '',
    unit: 'kg',
    location: '',
    description: ''
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

 useEffect(() => {
  document.title = "Warehouse Dashboard – AgriSync";

  if (!user) return; // Wait for user to load

  if (user.role !== "warehouse_manager") {
    navigate(`/${user.role || "login"}/dashboard`);
    return;
  }

  fetchInventory();
  fetchDeliveries();
  fetchWarehouseInfo();
  fetchLogs();
  fetchInventoryTrends();
  fetchWarehouseMetrics();
  fetchCapacityTrends();
}, [user]);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/inventory/location/${user.location}`, {
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
      const incoming = res.data.filter((d) => d.dropoffLocation === user.location);
      setDeliveries(incoming);
    } catch (err) {
      console.error("Deliveries load failed", err);
    }
  };

  const fetchWarehouseInfo = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/warehouse", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const match = res.data.find((w) => w.location === user.location);
      setWarehouse(match);
    } catch (err) {
      console.error("Warehouse info failed", err);
    }
  };

  const fetchInventoryTrends = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/analytics/inventory-trends', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventoryTrends(res.data);
    } catch (err) {
      console.error('Inventory trends fetch failed', err);
    }
  };

  const fetchWarehouseMetrics = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/analytics/warehouse-metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWarehouseMetrics(res.data);
    } catch (err) {
      console.error('Warehouse metrics fetch failed', err);
    }
  };

  const fetchCapacityTrends = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/analytics/capacity-trends', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCapacityTrends(res.data);
    } catch (err) {
      console.error('Capacity trends fetch failed', err);
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

  // Enhanced analytics calculations
  const totalStored = inventory.reduce((acc, item) => acc + item.quantity, 0);
  const capacityUsed = warehouse ? ((totalStored / warehouse.capacityLimit) * 100).toFixed(1) : 0;
  const lowStockItems = inventory.filter(item => parseInt(item.quantity) < 50).length;
  const criticalItems = inventory.filter(item => parseInt(item.quantity) < 20).length;
  const pendingDeliveries = deliveries.filter(d => d.status === 'pending').length;
  const todayDeliveries = deliveries.filter(d => 
    new Date(d.createdAt).toDateString() === new Date().toDateString()
  ).length;

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

  const addInventoryItem = async () => {
    try {
      await axios.post("http://localhost:5000/api/inventory", newInventoryItem, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowAddModal(false);
      setNewInventoryItem({
        itemName: '',
        quantity: '',
        unit: 'kg',
        location: '',
        description: ''
      });
      fetchInventory();
      fetchLogs();
    } catch (err) {
      console.error("Failed to add inventory item", err);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (inventoryFilter === 'all' || item.unit === inventoryFilter)
  );

  const filteredDeliveries = deliveries.filter(delivery => 
    (deliveryFilter === 'all' || delivery.status === deliveryFilter)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-300/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-200/30 to-blue-300/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-indigo-100/20 to-purple-100/20 rounded-full blur-3xl"></div>
      </div>
      
      {/* Top Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Warehouse className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AgriSync</h1>
                  <p className="text-xs text-gray-500">Warehouse Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <Bell className="h-6 w-6 text-gray-600 cursor-pointer hover:text-blue-600 transition-colors duration-200" onClick={() => setShowNotificationModal(true)} />
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-3 py-2 cursor-pointer hover:bg-white/70 transition-all duration-200 shadow-sm" onClick={() => setShowProfileModal(true)}>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
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
                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  Welcome back, {user?.name}! 🏬
                </h2>
                <p className="text-gray-600 text-lg">Managing {user?.location} warehouse operations.</p>
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
              <div className="hidden md:block">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <Warehouse className="h-16 w-16 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 relative z-10">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2">
            <nav className="flex space-x-2">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3, color: 'blue' },
                { id: 'inventory', label: 'Inventory', icon: Package, color: 'green' },
                { id: 'deliveries', label: 'Deliveries', icon: Truck, color: 'purple' },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'orange' },
                { id: 'reports', label: 'Reports', icon: FileText, color: 'indigo' }
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
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Inventory</p>
                    <p className="text-3xl font-bold text-gray-900">{inventory.length}</p>
                    <p className="text-sm text-green-600 font-medium">+2 new items</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Storage Capacity</p>
                    <p className="text-3xl font-bold text-gray-900">{capacityUsed}%</p>
                    <p className={`text-sm font-medium ${parseFloat(capacityUsed) > 90 ? 'text-red-600' : parseFloat(capacityUsed) > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {totalStored}/{warehouse?.capacityLimit || 0} units
                    </p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center ${
                    parseFloat(capacityUsed) > 90 ? 'from-red-500 to-red-600' : 
                    parseFloat(capacityUsed) > 70 ? 'from-yellow-500 to-yellow-600' : 
                    'from-green-500 to-green-600'
                  }`}>
                    <Database className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Deliveries</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingDeliveries}</p>
                    <p className="text-sm text-blue-600 font-medium">{todayDeliveries} today</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                    <p className="text-3xl font-bold text-gray-900">{lowStockItems}</p>
                    <p className="text-sm text-red-600 font-medium">{criticalItems} critical</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Inventory Distribution */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Inventory Distribution
                </h3>
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
                    <div className="text-center">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No inventory data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Status */}
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-purple-600" />
                  Delivery Status
                </h3>
                {deliveryStatusData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={deliveryStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={(entry) => entry.fill} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No delivery data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Capacity Status */}
            {warehouse && (
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-600" />
                  Warehouse Capacity Status
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Usage</span>
                    <span className="font-semibold">{totalStored} / {warehouse.capacityLimit} units</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-500 ${
                        parseFloat(capacityUsed) > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                        parseFloat(capacityUsed) > 70 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                        'bg-gradient-to-r from-green-500 to-green-600'
                      }`}
                      style={{ width: `${capacityUsed}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">0%</span>
                    <span className={`font-bold ${
                      parseFloat(capacityUsed) > 90 ? 'text-red-600' :
                      parseFloat(capacityUsed) > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>{capacityUsed}% Used</span>
                    <span className="text-gray-500">100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 group"
                >
                  <Plus className="h-8 w-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-green-700">Add Inventory</span>
                </button>
                <button
                  onClick={() => setActiveTab('deliveries')}
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
                >
                  <Truck className="h-8 w-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-blue-700">Manage Deliveries</span>
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
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all duration-200 group"
                >
                  <FileText className="h-8 w-8 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-orange-700">Generate Reports</span>
                </button>
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
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70"
                  />
                </div>
                <select
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70"
                >
                  <option value="all">All Units</option>
                  <option value="kg">Kilograms</option>
                  <option value="tons">Tons</option>
                  <option value="units">Units</option>
                </select>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Item
              </button>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/70">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/50 divide-y divide-gray-200">
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map((item, index) => (
                        <tr key={index} className="hover:bg-white/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Package className="h-8 w-8 text-blue-600 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                                <div className="text-sm text-gray-500">{item.description || 'No description'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${
                              parseInt(item.quantity) < 20 ? 'text-red-600' :
                              parseInt(item.quantity) < 50 ? 'text-yellow-600' :
                              'text-gray-900'
                            }`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              parseInt(item.quantity) < 20 ? 'bg-red-100 text-red-800' :
                              parseInt(item.quantity) < 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {parseInt(item.quantity) < 20 ? 'Critical' :
                               parseInt(item.quantity) < 50 ? 'Low Stock' :
                               'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-900 transition-colors">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="text-green-600 hover:text-green-900 transition-colors">
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-900 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
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
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6">
              {filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((delivery, index) => (
                  <div key={index} className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Truck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{delivery.goodsDescription || delivery.itemName}</h4>
                          <p className="text-sm text-gray-500">Quantity: {delivery.quantity} units</p>
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
                        {delivery.status === 'pending' && (
                          <button
                            onClick={() => confirmDelivery(delivery)}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg text-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center"
                          >
                            <Check className="h-4 w-4 mr-1" />
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
                  </div>
                ))
              ) : (
                <div className="bg-white/70 backdrop-blur-sm p-12 rounded-2xl shadow-lg border border-white/20 text-center">
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
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                  Storage Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={capacityTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="usage" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart2 className="h-5 w-5 mr-2 text-indigo-600" />
                  Warehouse Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">Average Processing Time</span>
                    <span className="text-lg font-bold text-blue-600">2.4 hrs</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">Storage Efficiency</span>
                    <span className="text-lg font-bold text-green-600">87%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-800">Monthly Throughput</span>
                    <span className="text-lg font-bold text-purple-600">1,240 units</span>
                  </div>
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
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/70" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <DatePicker 
                  selected={to} 
                  onChange={setTo} 
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/70" 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a 
                href={buildUrl("http://localhost:5000/api/export/inventory")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-green-700">Inventory (CSV)</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/inventory/pdf")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-blue-700">Inventory (PDF)</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/deliveries")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-purple-700">Deliveries (CSV)</span>
                </div>
              </a>
              <a 
                href={buildUrl("http://localhost:5000/api/export/orders")} 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-orange-700">Orders (CSV)</span>
                </div>
              </a>
              <a 
                href="http://localhost:5000/api/export/warehouse-summary" 
                className="flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 group text-center"
              >
                <div>
                  <Download className="h-8 w-8 text-gray-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-700">Summary (CSV)</span>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-600" />
                Recent Activity
              </h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 transition-colors">View All</button>
            </div>
            {logs.length > 0 ? (
              <div className="space-y-4">
                {logs.slice(0, 5).map((log, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50/70 rounded-lg hover:bg-white/50 transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {log.itemName} - {log.quantity} {log.unit} at {log.location}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
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
      </div>

      {/* Add Inventory Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <AddInventoryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchInventory}
        />
      </Modal>
    </div>
  );
}

export default WarehouseDashboard;
