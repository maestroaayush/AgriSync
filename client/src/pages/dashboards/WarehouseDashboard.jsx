import { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import Modal from "../../components/Modal";
import AddInventoryModal from "../../components/AddInventoryModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, API_ENDPOINTS } from '../../config/api';

function WarehouseDashboard() {
  const [inventory, setInventory] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [warehouse, setWarehouse] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

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
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.inventory.logs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(res.data.logs || []);
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
}, [user]);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.inventory.location(user.location)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(res.data);
    } catch (err) {
      console.error("Inventory load failed", err);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.deliveries}`, {
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
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.warehouses}`, {
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
        `${API_BASE_URL}${API_ENDPOINTS.deliveries}/${delivery._id}/status`,
        { status: "delivered" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.inventory.base}`,
        {
          itemName: delivery.goodsDescription,
          quantity: delivery.quantity,
          unit: "pieces",
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

  return (
    <div className="min-h-screen p-6 bg-blue-50">
      <div className="flex justify-end mb-6">
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <h1 className="text-3xl font-bold text-blue-800 mb-6">
        Warehouse Manager – {user.location}
      </h1>

      <div className="mb-6 p-4 bg-white rounded-xl shadow">
        <h2 className="text-xl font-semibold">Capacity Status</h2>
        {warehouse ? (
          <p className="mt-2 text-blue-800">
            {totalStored} / {warehouse.capacityLimit} units used (
            <span className={capacityUsed > 90 ? "text-red-600 font-semibold" : ""}>{capacityUsed}%</span>)
          </p>
        ) : (
          <p className="text-gray-500">No capacity set for this warehouse.</p>
        )}
      </div>

      <div className="mt-8 bg-white p-4 rounded-xl shadow max-w-xl">
        <h2 className="text-xl font-semibold mb-3">Export Reports by Date</h2>
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-sm mb-1">From</label>
            <DatePicker selected={from} onChange={setFrom} className="border px-2 py-1 rounded" />
          </div>
          <div>
            <label className="block text-sm mb-1">To</label>
            <DatePicker selected={to} onChange={setTo} className="border px-2 py-1 rounded" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={buildUrl(`${API_BASE_URL}${API_ENDPOINTS.export.inventory}`)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Inventory (CSV)</a>
          <a href={buildUrl(`${API_BASE_URL}${API_ENDPOINTS.export.inventoryPdf}`)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Inventory (PDF)</a>
          <a href={buildUrl(`${API_BASE_URL}${API_ENDPOINTS.export.deliveries}`)} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">Deliveries (CSV)</a>
          <a href={buildUrl(`${API_BASE_URL}${API_ENDPOINTS.export.orders}`)} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">Vendor Orders (CSV)</a>
          <a href={`${API_BASE_URL}${API_ENDPOINTS.export.warehouseSummary}`} className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800">Warehouse Summary (CSV)</a>
        </div>
      </div>

      <div className="mb-6 p-4 bg-white rounded-xl shadow">
        <h2 className="text-xl font-semibold">Incoming Deliveries</h2>
        {deliveries.length === 0 ? (
          <p className="text-gray-500">No incoming deliveries.</p>
        ) : (
          <ul className="list-disc ml-5 space-y-1">
            {deliveries.map((d) => (
              <li key={d._id} className="flex justify-between items-center">
                <span>{d.goodsDescription} – {d.quantity} units from Farmer ID {d.farmer}</span>
                {d.status === "pending" && (
                  <button
                    onClick={() => confirmDelivery(d)}
                    className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Confirm Received
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-6 p-4 bg-white rounded-xl shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Warehouse Inventory</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
          >
            Add Inventory
          </button>
        </div>
        {inventory.length === 0 ? (
          <p className="text-gray-500">No inventory recorded.</p>
        ) : (
          <ul className="space-y-2">
            {inventory.map((item) => (
              <li key={item._id}>{item.itemName} – {item.quantity} {item.unit}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 p-4 bg-white rounded-xl shadow max-w-xl">
        <h2 className="text-xl font-semibold mb-2">Recent Inventory Logs</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          {logs.map((log) => (
            <li key={log._id}>{log.itemName} – {log.quantity} {log.unit || 'units'} at {log.location} on {new Date(log.createdAt).toLocaleString()}</li>
          ))}
        </ul>
      </div>

      {inventory.length > 0 && (
        <div className="p-4 bg-white rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">Inventory Breakdown</h2>
          <PieChart width={400} height={300}>
            <Pie
              data={inventory}
              dataKey="quantity"
              nameKey="itemName"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              {inventory.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>

          {warehouse && (
            <div className="mt-8 p-4 bg-white rounded-xl shadow max-w-xl">
              <h2 className="text-xl font-semibold mb-2">Warehouse Summary</h2>
              <p><strong>Location:</strong> {warehouse.location}</p>
              <p><strong>Capacity:</strong> {warehouse.capacityLimit} units</p>
              <p><strong>Total Stored:</strong> {totalStored} units</p>
              <p><strong>Used:</strong> <span className={capacityUsed > 90 ? "text-red-600 font-semibold" : ""}>{capacityUsed}%</span></p>
              <p><strong>Items:</strong> {inventory.length}</p>
            </div>
          )}
        </div>
      )}

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
