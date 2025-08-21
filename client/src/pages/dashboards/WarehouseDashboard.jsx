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
import ExportButton from "../../components/ExportButton";
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
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [selectedDeliveryTracking, setSelectedDeliveryTracking] = useState(null);
  
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
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showEditInventoryModal, setShowEditInventoryModal] = useState(false);
  const [showDeleteInventoryModal, setShowDeleteInventoryModal] = useState(false);
  
  // Receipt confirmation states
  const [receiptForm, setReceiptForm] = useState({
    unit: 'kg',
    location: '',
    qualityNotes: '',
    condition: 'good',
    receivedQuantity: ''
  });
  const [selectedDeliveryForReceipt, setSelectedDeliveryForReceipt] = useState(null);
  
  // Inventory edit/delete states
  const [editingInventory, setEditingInventory] = useState(null);
  const [editInventoryForm, setEditInventoryForm] = useState({
    quantity: '',
    reason: ''
  });
  const [deleteInventoryForm, setDeleteInventoryForm] = useState({
    quantityToRemove: '',
    reason: ''
  });
  
  // Profile management states
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({
    location: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Profile picture states
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  
  // Location picker states
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [mapCenter, setMapCenter] = useState([27.7172, 85.3240]); // Kathmandu coordinates
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Form states
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  
  const [newInventoryItem, setNewInventoryItem] = useState({
    itemName: '',
    quantity: '',
    unit: 'kg',
    location: user?.location || '',
    description: ''
  });
  const navigate = useNavigate();
  const COLORS = ["#60A5FA", "#F59E0B", "#34D399", "#F472B6", "#A78BFA"];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const formatDate = (date) => date?.toISOString().split("T")[0] || "";
  
  // Status normalization helper to handle in-transit vs in_transit inconsistencies
  const normalizeStatus = (s) => (s || '').replace('-', '_').toLowerCase();
  
  // Fixed buildUrl function to handle export format parameters properly
  const buildUrl = (base) => {
    const url = new URL(base, window.location.origin);
    if (from) url.searchParams.set('from', formatDate(from));
    if (to) url.searchParams.set('to', formatDate(to));
    return url.toString();
  };
  
  // Tab styles mapping to avoid dynamic Tailwind class purging
  const tabStyles = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
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

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Notification fetch failed", err);
    }
  };

 useEffect(() => {
  document.title = "Warehouse Dashboard – AgriSync";

  if (!user) return; // Wait for user to load

  if (user.role !== "warehouse_manager") {
    if (user?.role) {
      navigate(`/${user.role}/dashboard`);
    } else {
      navigate("/");
    }
    return;
  }

  // Load essential data
  fetchInventory();
  fetchDeliveries();
  fetchLogs();
  fetchWarehouseInfo(); // Enable to get capacity data
  fetchWarehouseMetrics(); // Enable to get warehouse metrics
  
  // Optional data - can be enabled if needed
  // fetchInventoryTrends();
  // fetchCapacityTrends();
  // fetchNotifications();
  // fetchActiveDeliveries();
  
  // Disable automatic refresh to prevent resource exhaustion
  // const interval = setInterval(fetchNotifications, 30000);
  // const trackingInterval = setInterval(fetchActiveDeliveries, 60000);
  // return () => {
  //   clearInterval(interval);
  //   clearInterval(trackingInterval);
  // };
}, [navigate]); // Remove user from dependencies to prevent infinite loop

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
      // For warehouse managers, show deliveries for their location
      const incoming = res.data.filter((d) => d.dropoffLocation === user.location || d.destination === user.location);
      setDeliveries(incoming);
    } catch (err) {
      if (err.response?.status === 403) {
        console.warn("Access forbidden for deliveries endpoint. User may not have permission.");
        // Set empty array to prevent UI errors
        setDeliveries([]);
      } else if (err.response?.status === 404) {
        console.warn("Deliveries endpoint not found. API may not be implemented yet.");
        setDeliveries([]);
      } else {
        console.error("Deliveries load failed", err);
        setDeliveries([]);
      }
    }
  };

  const fetchWarehouseInfo = async () => {
    try {
      // Use the correct endpoint path with 's' - warehouses
      const res = await axios.get("http://localhost:5000/api/warehouses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const match = res.data.find((w) => w.location === user.location);
      if (match) {
        setWarehouse(match);
      } else {
        // If no warehouse found for this location, set default values
        console.warn("No warehouse found for location:", user.location);
        setWarehouse({
          location: user.location,
          capacityLimit: 10000, // Default capacity
          name: `${user.location} Warehouse`,
          manager: user.name
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn("Warehouse endpoint not found. Creating default warehouse data.");
        // Set default warehouse info for demo purposes
        setWarehouse({
          location: user.location,
          capacityLimit: 10000, // Default capacity
          name: `${user.location} Warehouse`,
          manager: user.name
        });
      } else {
        console.error("Warehouse info failed", err);
        // Still set default values to prevent UI errors
        setWarehouse({
          location: user.location,
          capacityLimit: 10000, // Default capacity
          name: `${user.location} Warehouse`,
          manager: user.name
        });
      }
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

  const fetchActiveDeliveries = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/delivery/active-locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveDeliveries(res.data || []);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn('Active deliveries endpoint not found. Feature may not be implemented yet.');
        setActiveDeliveries([]);
      } else {
        console.error('Active deliveries fetch failed', err);
        setActiveDeliveries([]);
      }
    }
  };

  const handleTrackDelivery = (delivery) => {
    setSelectedDeliveryTracking(delivery);
    setShowTrackingMap(true);
  };

  // Accept a delivery request
  const acceptDeliveryRequest = async (delivery) => {
    try {
      await axios.put(
        `http://localhost:5000/api/deliveries/${delivery._id}/status`,
        { status: "accepted" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Create notification for farmer
      await axios.post(
        'http://localhost:5000/api/notifications',
        {
          title: 'Delivery Request Accepted',
          message: `Your delivery request for ${delivery.goodsDescription} has been accepted by ${user.location} warehouse.`,
          type: 'success',
          recipientId: delivery.farmer
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchDeliveries();
      alert('Delivery request accepted successfully!');
    } catch (err) {
      console.error("Failed to accept delivery", err);
      alert('Failed to accept delivery request.');
    }
  };

  // Reject a delivery request
  const rejectDeliveryRequest = async (delivery) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await axios.put(
        `http://localhost:5000/api/deliveries/${delivery._id}/status`,
        { status: "rejected", rejectionReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Create notification for farmer
      await axios.post(
        'http://localhost:5000/api/notifications',
        {
          title: 'Delivery Request Rejected',
          message: `Your delivery request for ${delivery.goodsDescription} has been rejected by ${user.location} warehouse. Reason: ${reason}`,
          type: 'error',
          recipientId: delivery.farmer
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchDeliveries();
      alert('Delivery request rejected.');
    } catch (err) {
      console.error("Failed to reject delivery", err);
      alert('Failed to reject delivery request.');
    }
  };

  // Open detailed receipt modal
  const openReceiptModal = (delivery) => {
    setSelectedDeliveryForReceipt(delivery);
    setReceiptForm({
      unit: delivery.unit || 'kg',
      location: user.location || '',
      qualityNotes: '',
      condition: 'good',
      receivedQuantity: delivery.quantity.toString()
    });
    setShowReceiptModal(true);
  };

  // Confirm delivery receipt with detailed information
  const confirmDeliveryReceipt = async () => {
    if (!selectedDeliveryForReceipt) return;
    
    try {
      // Use the enhanced confirm-receipt endpoint
      await axios.put(
        `http://localhost:5000/api/delivery/${selectedDeliveryForReceipt._id}/confirm-receipt`,
        {
          unit: receiptForm.unit,
          location: receiptForm.location,
          qualityNotes: receiptForm.qualityNotes,
          condition: receiptForm.condition,
          receivedQuantity: parseInt(receiptForm.receivedQuantity)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Create notification for farmer
      await axios.post(
        'http://localhost:5000/api/notifications',
        {
          title: 'Delivery Confirmed',
          message: `Your delivery of ${selectedDeliveryForReceipt.goodsDescription} (${receiptForm.receivedQuantity} ${receiptForm.unit}) has been confirmed and added to inventory. Quality: ${receiptForm.condition}`,
          type: 'success',
          recipientId: selectedDeliveryForReceipt.farmer
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowReceiptModal(false);
      setSelectedDeliveryForReceipt(null);
      fetchDeliveries();
      fetchInventory();
      
      // Show detailed inventory transfer feedback
      alert(`✅ Delivery Receipt Confirmed Successfully!\n\n📦 Items: ${selectedDeliveryForReceipt.goodsDescription} (${receiptForm.receivedQuantity} ${receiptForm.unit})\n\n🔄 Inventory Transfer Completed:\n🌾 Farmer inventory: Items automatically removed from farm\n🏦 Your warehouse inventory: Items automatically added\n📝 Quality condition: ${receiptForm.condition}${receiptForm.qualityNotes ? `\n📋 Quality notes: ${receiptForm.qualityNotes}` : ''}\n\n📧 All parties have been notified of the receipt confirmation.\n\n🎉 Thank you for using AgriSync!`);
    } catch (err) {
      console.error("Failed to confirm delivery receipt", err);
      alert('Failed to confirm delivery receipt.');
    }
  };
  
  // Basic confirm delivery (for backward compatibility)
  const confirmDelivery = async (delivery) => {
    openReceiptModal(delivery);
  };

  // Enhanced analytics calculations
  const totalStored = (inventory || []).reduce((acc, item) => acc + (item?.quantity || 0), 0);
  const capacityUsed = warehouse ? ((totalStored / warehouse.capacityLimit) * 100).toFixed(1) : 0;
  const lowStockItems = (inventory || []).filter(item => item && parseInt(item.quantity) < 50).length;
  const criticalItems = (inventory || []).filter(item => item && parseInt(item.quantity) < 20).length;
  const pendingDeliveries = (deliveries || []).filter(d => d && d.status === 'pending').length;
  const todayDeliveries = (deliveries || []).filter(d => 
    d && d.createdAt && new Date(d.createdAt).toDateString() === new Date().toDateString()
  ).length;

  // Prepare chart data
  const inventoryChartData = (inventory || []).filter(Boolean).map((item, index) => ({
    name: item?.itemName || 'Unknown Item',
    value: item?.quantity || 0,
    fill: COLORS[index % COLORS.length]
  }));

  // Apply status normalization for consistency
  const deliveryStatusData = [
    { name: 'Pending', value: (deliveries || []).filter(d => d && normalizeStatus(d.status) === 'pending').length, fill: '#F59E0B' },
    { name: 'In Transit', value: (deliveries || []).filter(d => d && normalizeStatus(d.status) === 'in_transit').length, fill: '#60A5FA' },
    { name: 'Delivered', value: (deliveries || []).filter(d => d && normalizeStatus(d.status) === 'delivered').length, fill: '#34D399' }
  ];

  const addInventoryItem = async () => {
    try {
      // Use the warehouse-specific endpoint for adding inventory
      const itemData = {
        ...newInventoryItem,
        location: user.location, // Ensure location is set to user's location
        reason: 'Manual addition by warehouse manager'
      };
      
      await axios.post("http://localhost:5000/api/warehouse/inventory/add", itemData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowAddModal(false);
      setNewInventoryItem({
        itemName: '',
        quantity: '',
        unit: 'kg',
        location: user.location,
        description: ''
      });
      fetchInventory();
      fetchLogs();
      alert('✅ Inventory item added successfully!');
    } catch (err) {
      console.error("Failed to add inventory item", err);
      alert('Failed to add inventory item: ' + (err.response?.data?.message || err.message));
    }
  };
  
  // Edit inventory item (adjust quantity)
  const handleEditInventory = (item) => {
    setEditingInventory(item);
    setEditInventoryForm({
      quantity: item.quantity.toString(),
      reason: ''
    });
    setShowEditInventoryModal(true);
  };
  
  const updateInventoryQuantity = async () => {
    if (!editingInventory || !editInventoryForm.reason) {
      alert('Please provide a reason for the adjustment');
      return;
    }
    
    const currentQuantity = parseInt(editingInventory.quantity);
    const newQuantity = parseInt(editInventoryForm.quantity);
    const quantityChange = newQuantity - currentQuantity;
    
    if (quantityChange === 0) {
      alert('No quantity change detected');
      return;
    }
    
    try {
      const response = await axios.put(
        `http://localhost:5000/api/warehouse/inventory/${editingInventory._id}/adjust`,
        {
          quantityChange: quantityChange,
          reason: editInventoryForm.reason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setShowEditInventoryModal(false);
      setEditingInventory(null);
      setEditInventoryForm({ quantity: '', reason: '' });
      fetchInventory();
      fetchLogs();
      
      const action = quantityChange > 0 ? 'increased' : 'decreased';
      alert(`✅ Inventory ${action} successfully!\n\nItem: ${editingInventory.itemName}\nChange: ${quantityChange > 0 ? '+' : ''}${quantityChange} ${editingInventory.unit}\nNew Quantity: ${newQuantity} ${editingInventory.unit}\nReason: ${editInventoryForm.reason}`);
    } catch (err) {
      console.error('Failed to update inventory quantity', err);
      alert('Failed to update inventory quantity: ' + (err.response?.data?.message || err.message));
    }
  };
  
  // Delete/Remove inventory item
  const handleDeleteInventory = (item) => {
    setEditingInventory(item);
    setDeleteInventoryForm({
      quantityToRemove: item.quantity.toString(),
      reason: ''
    });
    setShowDeleteInventoryModal(true);
  };
  
  const removeInventoryItem = async () => {
    if (!editingInventory || !deleteInventoryForm.reason) {
      alert('Please provide a reason for removal');
      return;
    }
    
    const quantityToRemove = parseInt(deleteInventoryForm.quantityToRemove);
    if (quantityToRemove <= 0) {
      alert('Please enter a valid quantity to remove');
      return;
    }
    
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/warehouse/inventory/${editingInventory._id}/remove`,
        {
          data: {
            quantityToRemove: quantityToRemove < parseInt(editingInventory.quantity) ? quantityToRemove : null,
            reason: deleteInventoryForm.reason
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setShowDeleteInventoryModal(false);
      setEditingInventory(null);
      setDeleteInventoryForm({ quantityToRemove: '', reason: '' });
      fetchInventory();
      fetchLogs();
      
      const isFullRemoval = quantityToRemove >= parseInt(editingInventory.quantity);
      alert(`✅ Inventory ${isFullRemoval ? 'removed' : 'reduced'} successfully!\n\nItem: ${editingInventory.itemName}\nQuantity Removed: ${quantityToRemove} ${editingInventory.unit}\nReason: ${deleteInventoryForm.reason}`);
    } catch (err) {
      console.error('Failed to remove inventory', err);
      alert('Failed to remove inventory: ' + (err.response?.data?.message || err.message));
    }
  };

  // Get unique crops from inventory for filtering
  const uniqueCrops = [...new Set((inventory || []).filter(Boolean).map(item => item?.itemName || item?.cropType).filter(Boolean))].sort();
  
  // Get unique units from inventory for filtering
  const uniqueUnits = [...new Set((inventory || []).filter(Boolean).map(item => item?.unit).filter(Boolean))].sort();
  
  const filteredInventory = (inventory || []).filter(Boolean).filter(item => {
    if (!item || !item.itemName) return false;
    
    // Search term filter
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Unit filter
    const matchesUnit = inventoryFilter === 'all' || item.unit === inventoryFilter;
    
    // Crop filter
    const matchesCrop = cropFilter === 'all' || 
                       item.itemName === cropFilter || 
                       item.cropType === cropFilter ||
                       (item.itemName && item.itemName.toLowerCase().includes(cropFilter.toLowerCase()));
    
    return matchesSearch && matchesUnit && matchesCrop;
  });

  const filteredDeliveries = (deliveries || []).filter(Boolean).filter(delivery =>
    delivery && (deliveryFilter === 'all' || delivery.status === deliveryFilter)
  );

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
          const { latitude, longitude } = position.coords;
          const coords = [latitude, longitude];
          setSelectedCoordinates(coords);
          setMapCenter(coords);
          reverseGeocode(latitude, longitude);
          setIsGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsGettingLocation(false);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser');
      setIsGettingLocation(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      if (data.display_name) {
        setProfileForm(prev => ({
          ...prev,
          location: data.display_name
        }));
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    const coords = [lat, lng];
    setSelectedCoordinates(coords);
    reverseGeocode(lat, lng);
  };

  const selectLocationOnMap = () => {
    setShowLocationPicker(false);
  };

  // Map click handler component
  const MapClickHandler = () => {
    useMapEvents({
      click: handleMapClick,
    });
    return null;
  };

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
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
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
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <Warehouse className="h-16 w-16 text-blue-600" />
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
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {deliveryStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
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
                  onChange={(e) => {
                    console.log('Unit filter changed to:', e.target.value);
                    setInventoryFilter(e.target.value);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 pointer-events-auto cursor-pointer relative z-20"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 20 }}
                >
                  <option value="all">All Units</option>
                  {uniqueUnits.map((unit, index) => (
                    <option key={index} value={unit}>
                      {unit === 'kg' ? 'Kilograms' : 
                       unit === 'tons' ? 'Tons' : 
                       unit === 'liters' ? 'Liters' : 
                       unit === 'units' ? 'Units' : 
                       unit === 'bags' ? 'Bags' : 
                       unit === 'boxes' ? 'Boxes' : 
                       unit.charAt(0).toUpperCase() + unit.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  value={cropFilter}
                  onChange={(e) => {
                    console.log('Crop filter changed to:', e.target.value);
                    console.log('Available unique crops:', uniqueCrops);
                    setCropFilter(e.target.value);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/70 pointer-events-auto cursor-pointer relative z-20"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 20 }}
                >
                  <option value="all">All Crops</option>
                  {uniqueCrops.map((crop, index) => (
                    <option key={index} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Add Item button clicked!');
                  setShowAddModal(true);
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center shadow-lg pointer-events-auto cursor-pointer relative z-30"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 30 }}
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
                              <button 
                                onClick={() => {
                                  setSelectedInventoryItem(item);
                                  // You can add a view modal here if needed
                                  alert(`Item Details:\n\nName: ${item.itemName}\nQuantity: ${item.quantity} ${item.unit}\nLocation: ${item.location}\nDescription: ${item.description || 'N/A'}`);
                                }}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleEditInventory(item)}
                                className="text-green-600 hover:text-green-900 transition-colors"
                                title="Adjust Quantity"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteInventory(item)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Remove Item"
                              >
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
                  onChange={(e) => {
                    console.log('Delivery filter changed to:', e.target.value);
                    setDeliveryFilter(e.target.value);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 pointer-events-auto cursor-pointer relative z-20"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 20 }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="requested">Requested</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="rejected">Rejected</option>
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
                          <div className="flex items-center space-x-2 relative z-10">
                            <button
                              onClick={() => acceptDeliveryRequest(delivery)}
                              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-lg text-xs hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 pointer-events-auto"
                              title="Accept delivery request"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Accept
                            </button>
                            <button
                              onClick={() => rejectDeliveryRequest(delivery)}
                              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-lg text-xs hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 pointer-events-auto"
                              title="Reject delivery request"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                        {delivery.status === 'accepted' && (
                          <button
                            onClick={() => confirmDelivery(delivery)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center pointer-events-auto"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Confirm Receipt
                          </button>
                        )}
                        {(delivery.status === 'in-transit' || delivery.status === 'assigned') && (
                          <button
                            onClick={() => handleTrackDelivery(delivery)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center"
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            Track
                          </button>
                        )}
                        {delivery.status === 'delivered' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                // Show detailed delivery completion info with inventory transfer from warehouse perspective
                                alert(`✅ Delivery Received Successfully!\n\n📦 Items: ${delivery.goodsDescription || delivery.itemName} (${delivery.quantity} units)\n\n🔄 Inventory Transfer Completed:\n🌾 Farmer inventory: Items automatically removed from farm\n🏦 Your warehouse inventory: Items automatically added\n\n📧 All parties have been notified of the completion.\n\n🎉 Thank you for using AgriSync!`);
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
              <div className="flex justify-center">
                <ExportButton
                  onExport={(format) => {
                    const url = buildUrl(`http://localhost:5000/api/export/inventory?format=${format}`);
                    window.location.href = url;
                  }}
                  label="Inventory"
                  formats={['csv', 'xlsx', 'pdf']}
                  theme="green"
                />
              </div>
              <div className="flex justify-center">
                <ExportButton
                  onExport={(format) => {
                    const url = buildUrl(`http://localhost:5000/api/export/deliveries?format=${format}`);
                    window.location.href = url;
                  }}
                  label="Deliveries"
                  formats={['csv', 'xlsx', 'pdf']}
                  theme="purple"
                />
              </div>
              <div className="flex justify-center">
                <ExportButton
                  onExport={(format) => {
                    const url = buildUrl(`http://localhost:5000/api/export/warehouse-summary?format=${format}`);
                    window.location.href = url;
                  }}
                  label="Summary"
                  formats={['csv', 'xlsx', 'pdf']}
                  theme="blue"
                />
              </div>
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

      {/* Notification Modal */}
      <Modal 
        isOpen={showNotificationModal} 
        onClose={() => setShowNotificationModal(false)}
        title="Notifications"
        description="View your warehouse notifications and alerts"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-blue-800 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </h2>
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
              className="text-sm text-blue-600 underline hover:text-blue-800 transition-colors"
            >
              Mark All as Read
            </button>
          </div>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications.</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {notifications.map((note) => (
                <li
                  key={note._id}
                  className={`p-3 rounded border ${
                    note.read ? "bg-gray-50 text-gray-600" : "bg-blue-100 text-blue-900"
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

      {/* Add Inventory Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        className="max-w-2xl"
        title="Add Inventory Item"
        description="Add a new item to warehouse inventory"
      >
        <AddInventoryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchInventory();
            fetchLogs();
          }}
        />
      </Modal>

      {/* Profile Modal */}
      <Modal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        className="max-w-md"
        title="User Profile"
        description="View your profile information"
      >
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
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
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
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center"
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
      <Modal 
        isOpen={showEditProfileModal} 
        onClose={() => setShowEditProfileModal(false)} 
        className="max-w-md"
        title="Edit Profile"
        description="Update your profile information"
      >
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
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
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
                    className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-all text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
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
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-10 pr-16 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-blue-600 hover:text-blue-800 transition-colors rounded-lg hover:bg-blue-50"
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
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm"
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
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({...profileForm, newPassword: e.target.value})}
                    placeholder="Enter new password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/80 backdrop-blur-sm"
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
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
      <Modal 
        isOpen={showLocationPicker} 
        onClose={() => setShowLocationPicker(false)}
        title="Location Picker"
        description="Select a location on the map"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-blue-800 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Choose Location
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <button
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center shadow-lg disabled:opacity-50"
              >
                {isGettingLocation ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
              </button>
            </div>
            
            <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-300">
              <MapContainer 
                center={mapCenter} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapClickHandler />
                {selectedCoordinates && (
                  <Marker position={selectedCoordinates} />
                )}
              </MapContainer>
            </div>
            
            {selectedCoordinates && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  <strong>Selected:</strong> {selectedCoordinates[0].toFixed(6)}, {selectedCoordinates[1].toFixed(6)}
                </p>
                {profileForm.location && (
                  <p className="text-green-700 text-sm mt-1">
                    <strong>Address:</strong> {profileForm.location}
                  </p>
                )}
              </div>
            )}
            
            <p className="text-sm text-gray-500">
              Click on the map to select a location, or use the "Use Current Location" button to get your GPS coordinates.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowLocationPicker(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={selectLocationOnMap}
              disabled={!selectedCoordinates}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center shadow-lg disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-2" />
              Select This Location
            </button>
          </div>
        </div>
      </Modal>

      {/* Transporter Tracking Map Modal */}
      <Modal 
        isOpen={showTrackingMap} 
        onClose={() => setShowTrackingMap(false)}
        title="Delivery Tracking"
        description="Track delivery location on map"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-blue-800 flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Track Transporter Location
            </h2>
            <button
              onClick={() => setShowTrackingMap(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {selectedDeliveryTracking && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedDeliveryTracking.goodsDescription}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Quantity: {selectedDeliveryTracking.quantity} units
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">From</p>
                    <p className="font-medium">{selectedDeliveryTracking.pickupLocation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">To</p>
                    <p className="font-medium">{selectedDeliveryTracking.dropoffLocation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedDeliveryTracking.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      selectedDeliveryTracking.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedDeliveryTracking.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500">Transporter</p>
                    <p className="font-medium">{selectedDeliveryTracking.transporter?.name || 'Not assigned'}</p>
                  </div>
                </div>
              </div>
              
              <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300">
                <MapContainer 
                  center={selectedDeliveryTracking.currentLocation ? 
                    [selectedDeliveryTracking.currentLocation.latitude, selectedDeliveryTracking.currentLocation.longitude] : 
                    mapCenter
                  } 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Transporter current location */}
                  {selectedDeliveryTracking.currentLocation && (
                    <Marker 
                      position={[
                        selectedDeliveryTracking.currentLocation.latitude, 
                        selectedDeliveryTracking.currentLocation.longitude
                      ]}
                    />
                  )}
                  
                  {/* Show all active deliveries on the map */}
                  {activeDeliveries.filter(d => d.dropoffLocation === user?.location && d.currentLocation).map((delivery, index) => (
                    <Marker 
                      key={`active-${index}`}
                      position={[
                        delivery.currentLocation.latitude, 
                        delivery.currentLocation.longitude
                      ]}
                    />
                  ))}
                </MapContainer>
              </div>
              
              {selectedDeliveryTracking.currentLocation && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm mb-1">
                    <strong>Current Location:</strong> {selectedDeliveryTracking.currentLocation.latitude.toFixed(6)}, {selectedDeliveryTracking.currentLocation.longitude.toFixed(6)}
                  </p>
                  {selectedDeliveryTracking.currentLocation.lastUpdated && (
                    <p className="text-blue-700 text-xs">
                      <strong>Last Updated:</strong> {new Date(selectedDeliveryTracking.currentLocation.lastUpdated).toLocaleString()}
                    </p>
                  )}
                  {selectedDeliveryTracking.estimatedArrival && (
                    <p className="text-blue-700 text-xs mt-1">
                      <strong>ETA:</strong> {new Date(selectedDeliveryTracking.estimatedArrival).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              
              {!selectedDeliveryTracking.currentLocation && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <MapPin className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-yellow-800 text-sm">
                    Transporter location not available yet. The transporter may not have started sharing their location.
                  </p>
                </div>
              )}
            </>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowTrackingMap(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={fetchActiveDeliveries}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center shadow-lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Location
            </button>
          </div>
        </div>
      </Modal>

      {/* Detailed Receipt Confirmation Modal */}
      <Modal 
        isOpen={showReceiptModal} 
        onClose={() => setShowReceiptModal(false)}
        title="Order Receipt"
        description="View order receipt and details"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-blue-800 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Confirm Delivery Receipt
            </h2>
          </div>
          
          {selectedDeliveryForReceipt && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Delivery Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Item</p>
                    <p className="font-medium">{selectedDeliveryForReceipt.goodsDescription}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Expected Quantity</p>
                    <p className="font-medium">{selectedDeliveryForReceipt.quantity} units</p>
                  </div>
                  <div>
                    <p className="text-gray-500">From</p>
                    <p className="font-medium">{selectedDeliveryForReceipt.pickupLocation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Priority</p>
                    <p className="font-medium">{selectedDeliveryForReceipt.urgency || 'Normal'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Receipt Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Quantity
                    </label>
                    <input
                      type="number"
                      value={receiptForm.receivedQuantity}
                      onChange={(e) => setReceiptForm({...receiptForm, receivedQuantity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter received quantity"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      value={receiptForm.unit}
                      onChange={(e) => setReceiptForm({...receiptForm, unit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="kg">Kilograms</option>
                      <option value="tons">Tons</option>
                      <option value="units">Units</option>
                      <option value="bags">Bags</option>
                      <option value="liters">Liters</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={receiptForm.condition}
                    onChange={(e) => setReceiptForm({...receiptForm, condition: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    value={receiptForm.location}
                    onChange={(e) => setReceiptForm({...receiptForm, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter storage location within warehouse"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quality Notes (Optional)
                  </label>
                  <textarea
                    value={receiptForm.qualityNotes}
                    onChange={(e) => setReceiptForm({...receiptForm, qualityNotes: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any notes about quality, condition, or issues..."
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeliveryReceipt}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center shadow-lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Receipt & Add to Inventory
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Inventory Modal */}
      <Modal 
        isOpen={showEditInventoryModal} 
        onClose={() => setShowEditInventoryModal(false)}
        title="Adjust Inventory Quantity"
        description="Modify the quantity of inventory item"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-green-800 flex items-center">
              <Edit3 className="h-5 w-5 mr-2" />
              Adjust Inventory
            </h2>
          </div>
          
          {editingInventory && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Item Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Item Name</p>
                    <p className="font-medium">{editingInventory.itemName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current Quantity</p>
                    <p className="font-medium">{editingInventory.quantity} {editingInventory.unit}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium">{editingInventory.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unit</p>
                    <p className="font-medium">{editingInventory.unit}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editInventoryForm.quantity}
                    onChange={(e) => setEditInventoryForm({...editInventoryForm, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter new quantity"
                    min="0"
                  />
                  {editInventoryForm.quantity && (
                    <p className={`mt-1 text-sm ${
                      parseInt(editInventoryForm.quantity) > parseInt(editingInventory.quantity) 
                        ? 'text-green-600' 
                        : parseInt(editInventoryForm.quantity) < parseInt(editingInventory.quantity)
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {parseInt(editInventoryForm.quantity) > parseInt(editingInventory.quantity) 
                        ? `Increasing by ${parseInt(editInventoryForm.quantity) - parseInt(editingInventory.quantity)} ${editingInventory.unit}`
                        : parseInt(editInventoryForm.quantity) < parseInt(editingInventory.quantity)
                        ? `Decreasing by ${parseInt(editingInventory.quantity) - parseInt(editInventoryForm.quantity)} ${editingInventory.unit}`
                        : 'No change in quantity'
                      }
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Adjustment <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editInventoryForm.reason}
                    onChange={(e) => setEditInventoryForm({...editInventoryForm, reason: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter reason for adjustment (e.g., Stock count correction, Quality check, etc.)"
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowEditInventoryModal(false);
                setEditingInventory(null);
                setEditInventoryForm({ quantity: '', reason: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={updateInventoryQuantity}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center shadow-lg"
            >
              <Check className="h-4 w-4 mr-2" />
              Update Quantity
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete/Remove Inventory Modal */}
      <Modal 
        isOpen={showDeleteInventoryModal} 
        onClose={() => setShowDeleteInventoryModal(false)}
        title="Remove Inventory Item"
        description="Remove or reduce inventory quantity"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-red-800 flex items-center">
              <Trash2 className="h-5 w-5 mr-2" />
              Remove Inventory
            </h2>
          </div>
          
          {editingInventory && (
            <>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Warning</h3>
                    <p className="text-red-700 text-sm">
                      You are about to remove inventory. This action will be logged and cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Item Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Item Name</p>
                    <p className="font-medium">{editingInventory.itemName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current Quantity</p>
                    <p className="font-medium">{editingInventory.quantity} {editingInventory.unit}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium">{editingInventory.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unit</p>
                    <p className="font-medium">{editingInventory.unit}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to Remove <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={deleteInventoryForm.quantityToRemove}
                    onChange={(e) => setDeleteInventoryForm({...deleteInventoryForm, quantityToRemove: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter quantity to remove"
                    min="1"
                    max={editingInventory.quantity}
                  />
                  <p className="mt-1 text-sm text-gray-600">
                    Enter {editingInventory.quantity} to remove entire item, or a smaller amount for partial removal.
                  </p>
                  {deleteInventoryForm.quantityToRemove && (
                    <p className={`mt-1 text-sm font-medium ${
                      parseInt(deleteInventoryForm.quantityToRemove) >= parseInt(editingInventory.quantity)
                        ? 'text-red-600'
                        : 'text-orange-600'
                    }`}>
                      {parseInt(deleteInventoryForm.quantityToRemove) >= parseInt(editingInventory.quantity)
                        ? '⚠️ This will completely remove the item from inventory'
                        : `Will leave ${parseInt(editingInventory.quantity) - parseInt(deleteInventoryForm.quantityToRemove)} ${editingInventory.unit} remaining`
                      }
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Removal <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={deleteInventoryForm.reason}
                    onChange={(e) => setDeleteInventoryForm({...deleteInventoryForm, reason: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter reason for removal (e.g., Damaged goods, Expired, Sold, etc.)"
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowDeleteInventoryModal(false);
                setEditingInventory(null);
                setDeleteInventoryForm({ quantityToRemove: '', reason: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={removeInventoryItem}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center shadow-lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Inventory
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default WarehouseDashboard;
