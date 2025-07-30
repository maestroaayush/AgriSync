import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register({ embed = false, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "farmer"
  });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/auth/register", form);
      if (embed && onClose) onClose(); // Close modal if embedded
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className={embed ? "" : "min-h-screen flex items-center justify-center bg-gray-100"}>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4"
      >
        <h2 className="text-xl font-bold text-center text-green-700">Register</h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Name"
          className="w-full px-3 py-2 border rounded"
          required
          autoFocus
        />
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full px-3 py-2 border rounded"
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          className="w-full px-3 py-2 border rounded"
          required
        />
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="farmer">Farmer</option>
          <option value="transporter">Transporter</option>
          <option value="warehouse_manager">Warehouse Manager</option>
          <option value="market_vendor">Market Vendor</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Register
        </button>
        {embed && (
          <button
            type="button"
            onClick={onClose}
            className="block text-sm text-gray-500 text-center underline w-full mt-2"
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}

export default Register;
