import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../../components/Modal";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [selectedRole, setSelectedRole] = useState("admin");

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
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.users}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.summary}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to load summary", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.notifications.base}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Notification fetch failed", err);
    }
  };

  useEffect(() => {
    document.title = "Admin Dashboard – AgriSync";
    if (user?.role !== "admin") {
      navigate(`/${user?.role || "login"}/dashboard`);
      return;
    }
    fetchUsers();
    fetchSummary();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const switchRole = (newRole) => {
    navigate(`/${newRole}/dashboard`);
  };

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex gap-4 items-center">
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              switchRole(e.target.value);
            }}
            className="border px-2 py-1 rounded"
          >
            <option value="admin">Admin</option>
            <option value="market_vendor">Vendor</option>
            <option value="farmer">Farmer</option>
            <option value="warehouse_manager">Warehouse</option>
            <option value="transporter">Transporter</option>
          </select>
          <button
            className="text-gray-800 font-medium relative"
            onClick={() => setShowNotifModal(true)}
          >
            🔔 Notifications
            {notifications.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">
                {notifications.length}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

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

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Date Range Export</h2>
        <div className="flex gap-4 mb-4">
          <DatePicker selected={from} onChange={setFrom} placeholderText="From date" className="border px-2 py-1 rounded" />
          <DatePicker selected={to} onChange={setTo} placeholderText="To date" className="border px-2 py-1 rounded" />
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={buildUrl(`${API_BASE_URL}${API_ENDPOINTS.export.inventory}`)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Inventory (CSV)</a>
          <a href={buildUrl(`${API_BASE_URL}${API_ENDPOINTS.export.inventoryPdf}`)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Inventory (PDF)</a>
          <a href={buildUrl(`${API_BASE_URL}${API_ENDPOINTS.export.deliveries}`)} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">Deliveries (CSV)</a>
          <a href={buildUrl(`${API_BASE_URL}${API_ENDPOINTS.export.orders}`)} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Orders (CSV)</a>
          <a href={`${API_BASE_URL}${API_ENDPOINTS.export.warehouseSummary}`} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">Warehouse Summary (CSV)</a>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">All Users</h2>
        {users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {users.map((u) => (
              <li key={u._id}>{u.name} – {u.email} ({u.role})</li>
            ))}
          </ul>
        )}
      </div>

      <Modal isOpen={showNotifModal} onClose={() => setShowNotifModal(false)}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
            <button
              onClick={async () => {
                await axios.put(`${API_BASE_URL}${API_ENDPOINTS.notifications.markRead}`, {}, {
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
              {notifications.map((note) => (
                <li
                  key={note._id}
                  className={`p-3 rounded border ${
                    note.read ? "bg-gray-50 text-gray-600" : "bg-gray-100 text-gray-900"
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

export default AdminDashboard;
