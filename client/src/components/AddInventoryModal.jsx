import { useState } from "react";
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

function AddInventoryModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    itemName: "",
    quantity: "",
    unit: "kg",
    location: ""
  });

  const token = localStorage.getItem("token");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}${API_ENDPOINTS.inventory.base}`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess(); // refresh parent
      onClose();   // close modal
    } catch (err) {
      console.error("Add inventory failed", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-green-700">Add Inventory</h2>
      <input
        type="text"
        name="itemName"
        placeholder="Item Name"
        value={form.itemName}
        onChange={handleChange}
        className="w-full px-3 py-2 border rounded"
        required
      />
      <input
        type="number"
        name="quantity"
        placeholder="Quantity"
        value={form.quantity}
        onChange={handleChange}
        className="w-full px-3 py-2 border rounded"
        required
      />
      <select
        name="unit"
        value={form.unit}
        onChange={handleChange}
        className="w-full px-3 py-2 border rounded"
      >
        <option value="kg">kg</option>
        <option value="liters">liters</option>
        <option value="pieces">pieces</option>
      </select>
      <input
        type="text"
        name="location"
        placeholder="Storage Location"
        value={form.location}
        onChange={handleChange}
        className="w-full px-3 py-2 border rounded"
        required
      />
      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Save
      </button>
    </form>
  );
}

export default AddInventoryModal;
