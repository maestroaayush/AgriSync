import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../../components/Modal";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function TransporterDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [selectedRole, setSelectedRole] = useState("transporter");

  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

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
      const res = await axios.get("http://localhost:5000/api/deliveries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const assigned = res.data.filter((d) => d.transporter === user.id);
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

  useEffect(() => {
    document.title = "Transporter Dashboard – AgriSync";
    if (user?.role !== "transporter") {
      navigate(`/${user?.role || "login"}/dashboard`);
      return;
    }
    fetchDeliveries();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const switchRole = (newRole) => {
    navigate(`/${newRole}/dashboard`);
  };

  return (
    <div className="min-h-screen p-6 bg-sky-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-sky-800">Transporter Dashboard</h1>
        <div className="flex gap-4 items-center">
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              switchRole(e.target.value);
            }}
            className="border px-2 py-1 rounded"
          >
            <option value="transporter">Transporter</option>
            <option value="admin">Admin</option>
            <option value="farmer">Farmer</option>
            <option value="warehouse_manager">Warehouse</option>
            <option value="market_vendor">Vendor</option>
          </select>
          <button
            className="text-sky-800 font-medium relative"
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
        <h2 className="text-xl font-semibold mb-2">Date Range Export</h2>
        <div className="flex gap-4 mb-4">
          <DatePicker selected={from} onChange={setFrom} placeholderText="From date" className="border px-2 py-1 rounded" />
          <DatePicker selected={to} onChange={setTo} placeholderText="To date" className="border px-2 py-1 rounded" />
        </div>
        <a
          href={buildUrl("http://localhost:5000/api/export/deliveries")}
          className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700"
        >
          Export Deliveries (CSV)
        </a>
      </div>

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Assigned Deliveries</h2>
        {deliveries.length === 0 ? (
          <p className="text-gray-500">No deliveries assigned.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {deliveries.map((d) => (
              <li key={d._id} className="flex justify-between items-center">
                <span>
                  {d.goodsDescription} – {d.quantity} units from {d.pickupLocation} to {d.dropoffLocation} ({d.status})
                </span>
                {d.status === "assigned" && (
                  <button
                    onClick={() => updateStatus(d._id, "in_transit")}
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                  >
                    Start Transit
                  </button>
                )}
                {d.status === "in_transit" && (
                  <button
                    onClick={() => updateStatus(d._id, "delivered")}
                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                  >
                    Mark Delivered
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {deliveries.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <h2 className="text-xl font-semibold mb-2">Delivery Map</h2>
          <MapContainer center={[27.7, 85.3]} zoom={7} style={{ height: "400px", width: "100%" }}>
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
                  {d.goodsDescription} – {d.quantity} units<br />
                  To: {d.dropoffLocation}
                </Popup>
              </Marker>
            ))}
            {deliveries.map((d, idx) =>
              d.pickupLat && d.pickupLng && d.dropoffLat && d.dropoffLng ? (
                <Polyline
                  key={`line-${idx}`}
                  positions={[[d.pickupLat, d.pickupLng], [d.dropoffLat, d.dropoffLng]]}
                  color="blue"
                />
              ) : null
            )}
          </MapContainer>
        </div>
      )}

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
