import { useState } from "react";
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';

function Login({ embed = false, onClose }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user); // Update AuthContext
      const role = res.data.user.role;

      if (embed && onClose) onClose(); // Close modal if in embedded mode
      navigate(`/${role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className={embed ? "" : "min-h-screen flex items-center justify-center bg-gray-100"}>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4"
      >
        <h2 className="text-xl font-bold text-center text-green-700">Login to AgriSync</h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full px-3 py-2 border rounded"
          required
          autoFocus
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
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Login
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

export default Login;
