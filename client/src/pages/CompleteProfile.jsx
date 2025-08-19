import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { User, MapPin, Phone, Briefcase, ArrowRight, Shield } from "lucide-react";

function CompleteProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  
  const [form, setForm] = useState({
    role: "farmer",
    location: "",
    phone: ""
  });
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Get user info from location state (passed from OAuth callback)
    const stateUser = location.state?.user;
    if (!stateUser) {
      // If no user info is passed, redirect to home
      navigate("/", { replace: true });
      return;
    }
    setUserInfo(stateUser);
  }, [location.state, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.location.trim()) {
      setError("Location is required");
      setLoading(false);
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required");
      setLoading(false);
      return;
    }

    try {
      // Complete the profile by making an API call to update user info
      const response = await axios.post(
        "http://localhost:5000/api/auth/complete-google-profile",
        {
          userId: userInfo.id,
          role: form.role,
          location: form.location.trim(),
          phone: form.phone.trim()
        }
      );

      if (response.data.success) {
        // Navigate to homepage with success message about pending approval
        navigate("/", {
          state: {
            successMessage: `Welcome ${userInfo.name}! Your profile has been completed. Your account is pending admin approval. You will receive access to your dashboard once approved.`,
            pendingApproval: true,
            userInfo: {
              ...userInfo,
              role: form.role,
              location: form.location,
              phone: form.phone
            }
          },
          replace: true
        });
      }
    } catch (err) {
      console.error("Profile completion error:", err);
      setError(err.response?.data?.message || "Failed to complete profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Complete Your Profile</h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome {userInfo.name}! Please provide additional information to complete your AgriSync account.
          </p>
        </div>

        {/* User Info Display */}
        <div className="bg-white p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src={userInfo.profilePhoto || "/api/placeholder/40/40"} 
              alt={userInfo.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold text-gray-900">{userInfo.name}</p>
              <p className="text-sm text-gray-500">{userInfo.email}</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Profile Completion Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="inline w-4 h-4 mr-1" />
                Select your role
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="farmer">Farmer</option>
                <option value="transporter">Transporter</option>
                <option value="warehouse_manager">Warehouse Manager</option>
                <option value="market_vendor">Market Vendor</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                You can request role changes later through admin approval
              </p>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Location
              </label>
              <input
                id="location"
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Enter your city, state or address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline w-4 h-4 mr-1" />
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Completing Profile...
                </div>
              ) : (
                <div className="flex items-center">
                  Complete Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Info Message */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            After completing your profile, your account will be submitted for admin approval.
            You'll be notified once your account is approved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CompleteProfile;
