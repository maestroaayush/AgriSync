import { useState } from "react";
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

function RequestDeliveryModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    goodsDescription: "",
    pickupLocation: "",
    dropoffLocation: "",
    quantity: ""
  });

  const token = localStorage.getItem("token");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}${API_ENDPOINTS.deliveries}`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Delivery request failed", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-green-700">Request Delivery</h2>
      <input
        type="text"
        name="goodsDescription"
        placeholder="Goods Description"
        value={form.goodsDescription}
        onChange={handleChange}
        className="w-full px-3 py-2 border rounded"
        required
      />
      <input
        type="text"
        name="pickupLocation"
        placeholder="Pickup Location"
        value={form.pickupLocation}
        onChange={handleChange}
        className="w-full px-3 py-2 border rounded"
        required
      />
      <input
        type="text"
        name="dropoffLocation"
        placeholder="Dropoff Location"
        value={form.dropoffLocation}
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
      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Submit
      </button>
    </form>
  );
}

export default RequestDeliveryModal;
