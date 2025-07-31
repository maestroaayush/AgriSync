import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login({ embed = false, onClose }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      console.log('Attempting login with:', form);
      const res = await axios.post("http://localhost:5000/api/auth/login", form);
      console.log('Login response:', res.data);
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      
      // Update AuthContext with user data
      setUser(res.data.user);
      
      const role = res.data.user.role;
      console.log('User role:', role, 'Navigating to:', `/${role}/dashboard`);

      if (embed && onClose) onClose(); // Close modal if in embedded mode
      navigate(`/${role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
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
        <h2 className="text-xl font-bold text-center text-green-700">Login to AgriSync</h2>
      {loading && <p className="text-blue-500 text-sm">Loading...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className={`w-full px-3 py-2 border rounded ${error && 'border-red-500'}`}
          required
          autoFocus
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
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded transition duration-150 ease-in-out ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {!embed && (
          <div className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-green-600 hover:text-green-700 underline"
            >
              Sign up here
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

export default Login;
