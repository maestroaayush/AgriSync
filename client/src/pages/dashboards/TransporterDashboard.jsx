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
  PieChart as PieChartIcon
} from "lucide-react";
import Modal from "../../components/Modal";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
  
  // Modal states
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Form states
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [selectedRole, setSelectedRole] = useState("transporter");

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
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
      
      console.log('Filtered deliveries for transporter:', assigned.length);
      console.log('Assigned deliveries:', assigned);
      
      // Log delivery statuses for debugging
      console.log('Delivery statuses:');
      assigned.forEach((delivery, index) => {
        console.log(`Delivery ${index + 1}: ID=${delivery._id}, Status="${delivery.status}", Type=${typeof delivery.status}`);
      });
      
      const statusCounts = {
        delivered: assigned.filter(d => d.status === 'delivered').length,
        in_transit: assigned.filter(d => d.status === 'in_transit').length,
        assigned: assigned.filter(d => d.status === 'assigned').length,
        other: assigned.filter(d => !['delivered', 'in_transit', 'assigned'].includes(d.status)).length
      };
      console.log('Status counts:', statusCounts);
      
      setDeliveries(assigned);
    } catch (err) {
      console.error("Failed to load deliveries", err);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(
        `http://localhost:5000/api/deliveries/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDeliveries();
    } catch (err) {
      console.error("Failed to update delivery status", err);
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

  const fetchAnalytics = async () => {
    try {
      console.log('Fetching analytics data...');
      setLoading(true);
      
      // Fetch delivery trends
      const trendsRes = await axios.get("http://localhost:5000/api/analytics/transporter-trends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Trends response:', trendsRes.data);
      setTrends(trendsRes.data);
      console.log('Trends state updated:', trendsRes.data);

      // Fetch transporter metrics
      const metricsRes = await axios.get("http://localhost:5000/api/analytics/transporter-metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Metrics response:', metricsRes.data);
      console.log('Setting transportMetrics to:', metricsRes.data);
      setTransportMetrics(metricsRes.data);
      console.log('Setting fuelData to:', metricsRes.data.fuelEfficiency);
      setFuelData(metricsRes.data.fuelEfficiency);
      
      // Force re-render
      setRenderKey(prev => prev + 1);
      setLoading(false);
    } catch (err) {
      console.error("Analytics fetch failed", err);
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
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const switchRole = (newRole) => {
    navigate(`/${newRole}/dashboard`);
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

  const filteredDeliveries = deliveries.filter(delivery => 
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
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3 bg-white/50 backdrop-blur-sm rounded-full px-3 py-2 cursor-pointer hover:bg-white/70 transition-all duration-200 shadow-sm" onClick={() => setShowProfileModal(true)}>
                <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center">
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
                <div className="w-32 h-32 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="h-16 w-16 text-sky-600" />
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
                { id: 'overview', label: 'Overview', icon: BarChart3, color: 'sky' },
                { id: 'deliveries', label: 'Deliveries', icon: Package, color: 'blue' },
                { id: 'routes', label: 'Routes', icon: Navigation, color: 'indigo' },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'purple' },
                { id: 'reports', label: 'Reports', icon: FileText, color: 'green' }
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

            <div className="grid gap-6">
              {filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((delivery, index) => (
                  <div key={index} className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
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
                          <button
                            onClick={() => updateStatus(delivery._id, 'in_transit')}
                            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 flex items-center"
                          >
                            <Truck className="h-4 w-4 mr-1" />
                            Start Transit
                          </button>
                        )}
                        {delivery.status === 'in_transit' && (
                          <button
                            onClick={() => updateStatus(delivery._id, 'delivered')}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg text-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Delivered
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
                        <p className="font-medium">{delivery.dropoffLocation || 'N/A'}</p>
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
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No deliveries found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Navigation className="h-5 w-5 mr-2 text-blue-600" />
              Delivery Routes Map
            </h3>
            {deliveries.length > 0 ? (
              <MapContainer center={[27.7, 85.3]} zoom={7} style={{ height: "500px", width: "100%" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {deliveries.map((d, idx) => (
                  <Marker
                    key={idx}
                    position={[d.dropoffLat || 27.7, d.dropoffLng || 85.3]}
                  >
                    <Popup>
                      <div className="p-2">
                        <h4 className="font-semibold">{d.goodsDescription}</h4>
                        <p className="text-sm">Quantity: {d.quantity} units</p>
                        <p className="text-sm">To: {d.dropoffLocation}</p>
                        <p className="text-sm">Status: {d.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {deliveries.map((d, idx) =>
                  d.pickupLat && d.pickupLng && d.dropoffLat && d.dropoffLng ? (
                    <Polyline
                      key={`line-${idx}`}
                      positions={[[d.pickupLat, d.pickupLng], [d.dropoffLat, d.dropoffLng]]}
                      color={d.status === 'delivered' ? '#10B981' : d.status === 'in_transit' ? '#0EA5E9' : '#F59E0B'}
                      weight={3}
                    />
                  ) : null
                )}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Navigation className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No routes to display</p>
                </div>
              </div>
            )}
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
                      <>
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
                      </>
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

      {/* Notification Modal */}
      <Modal isOpen={showNotifModal} onClose={() => setShowNotifModal(false)}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-sky-800">Notifications</h2>
            <button
              onClick={async () => {
                await axios.put("http://localhost:5000/api/notifications/mark-read", {}, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setShowNotifModal(false);
                fetchNotifications();
              }}
              className="text-sm text-sky-600 underline hover:text-sky-800"
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
                    note.read ? "bg-gray-50 text-gray-600" : "bg-sky-100 text-sky-900"
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
    </div>
  );
}

export default TransporterDashboard;
