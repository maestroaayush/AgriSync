import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../../components/Modal";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function VendorDashboard() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [form, setForm] = useState({ itemName: "", quantity: 1 });
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [selectedRole, setSelectedRole] = useState("market_vendor");

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

  useEffect(() => {
    document.title = "Vendor Dashboard – AgriSync";
    if (user?.role !== "market_vendor") {
      navigate(`/${user?.role || "login"}/dashboard`);
      return;
    }
    fetchOrders();
    fetchInventory();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="min-h-screen p-6 bg-yellow-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-800">
          Welcome, {user.name}
        </h1>
        <div className="flex gap-4 items-center">
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              switchRole(e.target.value);
            }}
            className="border px-2 py-1 rounded"
          >
            <option value="market_vendor">Vendor</option>
            <option value="farmer">Farmer</option>
            <option value="warehouse_manager">Warehouse</option>
            <option value="transporter">Transporter</option>
            <option value="admin">Admin</option>
          </select>
          <button
            className="text-yellow-800 font-medium relative"
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

      <div className="mb-6">
        <button
          onClick={() => setShowOrderModal(true)}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Place Order
        </button>
        <div className="mt-4 flex gap-4 items-center">
          <DatePicker
            selected={from}
            onChange={(date) => setFrom(date)}
            placeholderText="From date"
            className="border px-2 py-1 rounded"
          />
          <DatePicker
            selected={to}
            onChange={(date) => setTo(date)}
            placeholderText="To date"
            className="border px-2 py-1 rounded"
          />
          <a
            href={buildUrl("http://localhost:5000/api/export/orders")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export Orders CSV
          </a>
        </div>
      </div>

      <div className="mb-8 bg-white p-4 rounded-xl shadow max-w-xl">
        <h2 className="text-xl font-semibold mb-2">Orders Summary</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500">No orders placed.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {orders.map((order) => (
              <li key={order._id}>
                {order.itemName} – {order.quantity} {order.unit} ({order.status})
              </li>
            ))}
          </ul>
        )}
      </div>

      {orders.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">Order Breakdown</h2>
          <PieChart width={400} height={300}>
            <Pie
              data={Object.entries(orderSummary).map(([name, quantity]) => ({ itemName: name, quantity }))}
              dataKey="quantity"
              nameKey="itemName"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              {Object.entries(orderSummary).map(([_, __], index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      )}

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
            {inventory.map((inv) => (
              <option key={inv._id} value={inv.itemName}>
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
    </div>
  );
}

export default VendorDashboard;
