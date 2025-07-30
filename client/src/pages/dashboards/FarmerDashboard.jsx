import { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import Modal from "../../components/Modal";
import AddInventoryModal from "../../components/AddInventoryModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";

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

    // Redirect if role is not warehouse_manager
    if (user?.role !== "warehouse_manager") {
      window.location.href = `/${user?.role || "login"}/dashboard`;
      return;
    }

    fetchInventory();
    fetchDeliveries();
    fetchWarehouseInfo();
    fetchLogs();
  }, []);

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

  return (
    <div className="min-h-screen p-6 bg-blue-50">
      {/* ...UI continues unchanged... */}
    </div>
  );
}

export default WarehouseDashboard;
