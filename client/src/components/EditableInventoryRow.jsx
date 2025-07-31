import { useState } from "react";
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

function EditableInventoryRow({ item, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    quantity: item.quantity,
    unit: item.unit,
    location: item.location
  });

  const token = localStorage.getItem("token");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      await axios.put(`${API_BASE_URL}${API_ENDPOINTS.inventory.base}/${item._id}`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  return (
    <li className="bg-white rounded border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <strong>{item.itemName}</strong>

      {isEditing ? (
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className="w-20 px-2 border rounded"
          />
          <select
            name="unit"
            value={form.unit}
            onChange={handleChange}
            className="w-24 px-2 border rounded"
          >
            <option value="kg">kg</option>
            <option value="liters">liters</option>
            <option value="units">units</option>
          </select>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            className="w-28 px-2 border rounded"
          />
          <button
            onClick={handleSave}
            className="text-white bg-green-600 px-3 py-1 rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{item.quantity} {item.unit}</span>
          <span className="text-gray-500">({item.location})</span>
          <button
            onClick={() => setIsEditing(true)}
            className="text-green-600 underline text-sm"
          >
            Edit
          </button>
        </div>
      )}
    </li>
  );
}

export default EditableInventoryRow;
