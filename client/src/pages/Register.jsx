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
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");

  // Password strength checker
  const checkPasswordStrength = (password) => {
    if (password.length === 0) return "";
    if (password.length < 6) return "weak";
    if (password.length >= 6 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return "strong";
    return "medium";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear messages when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
    
    // Check password strength
    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    // Client-side validation
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.post("http://localhost:5000/api/auth/register", form);
      setSuccess(response.data.message || "Registration successful!");
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        if (embed && onClose) onClose(); // Close modal if embedded
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embed ? "" : "min-h-screen flex items-center justify-center bg-gray-100"}>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4"
      >
        <h2 className="text-xl font-bold text-center text-green-700">Register</h2>
        {loading && <p className="text-blue-500 text-sm">Loading...</p>}
        {success && <p className="text-green-500 text-sm">{success}</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Name"
          className={`w-full px-3 py-2 border rounded ${error && 'border-red-500'}`}
          required
          autoFocus
        />
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className={`w-full px-3 py-2 border rounded ${error && 'border-red-500'}`}
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          className={`w-full px-3 py-2 border rounded ${error && 'border-red-500'}`}
          required
        />
        {passwordStrength && (
          <div className="text-xs">
            Password strength: 
            <span className={`ml-1 font-semibold ${
              passwordStrength === 'weak' ? 'text-red-500' :
              passwordStrength === 'medium' ? 'text-yellow-500' : 'text-green-500'
            }`}>
              {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
            </span>
          </div>
        )}
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
          disabled={loading}
          className={`w-full py-2 rounded transition duration-150 ease-in-out ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>
        {!embed && (
          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-green-600 hover:text-green-700 underline"
            >
              Sign in here
            </button>
          </div>
        )}
        
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
