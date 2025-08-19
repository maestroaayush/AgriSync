import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Mail, RefreshCw, ArrowLeft, Eye, EyeOff } from "lucide-react";

function Register({ embed = false, onClose, onSwitchToLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "farmer",
    location: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Email verification states
  const [step, setStep] = useState(1); // 1: Registration, 2: Email Verification, 3: Success
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

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

  // Timer effect for resend OTP
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    // Client-side validation
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required");
      setLoading(false);
      return;
    }
    
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }
    
    try {
      // Combine first and last name before sending
      const userData = {
        ...form,
        name: `${form.firstName} ${form.lastName}`.trim()
      };
      delete userData.firstName;
      delete userData.lastName;
      
      const response = await axios.post("http://localhost:5000/api/auth/register", userData);
      
      // Handle different response scenarios
      if (response.data.requiresVerification) {
        setUserId(response.data.userId);
        setSuccess(response.data.message);
        setStep(2); // Move to email verification step
        setResendTimer(60); // Set 60-second timer for resend
      } else {
        setSuccess(response.data.message || "Registration successful!");
        // Auto-redirect after 2 seconds for non-verification flow
        setTimeout(() => {
          if (embed && onClose) onClose();
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      const errorData = err.response?.data;
      setError(errorData?.message || "Registration failed");
      
      // Handle case where user exists but needs verification
      if (errorData?.requiresVerification && errorData?.userId) {
        setUserId(errorData.userId);
        setStep(2);
        setResendTimer(60);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input changes
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
    
    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== "") && newOtp.join("").length === 6) {
      handleOtpSubmit(newOtp.join(""));
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (otpCode = null) => {
    const code = otpCode || otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    setOtpLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/auth/verify-email", {
        userId,
        otp: code
      });
      
      setSuccess(response.data.message);
      setStep(3); // Move to success step
      
      // Auto-redirect to login after success
      setTimeout(() => {
        if (embed && onClose) {
          onClose();
          if (onSwitchToLogin) onSwitchToLogin();
        } else {
          navigate("/login");
        }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
      setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setResendLoading(true);
    setError("");
    
    try {
      const response = await axios.post("http://localhost:5000/api/auth/resend-otp", {
        userId
      });
      
      setSuccess(response.data.message);
      setResendTimer(60); // Reset timer
      setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend verification code");
    } finally {
      setResendLoading(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    setStep(1);
    setError("");
    setSuccess("");
    setOtp(["", "", "", "", "", ""]);
  };

  // Step 1: Registration Form
  if (step === 1) {
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
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="First Name"
              className={`w-full px-3 py-2 border rounded ${error && 'border-red-500'}`}
              required
              autoFocus
            />
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Last Name"
              className={`w-full px-3 py-2 border rounded ${error && 'border-red-500'}`}
              required
            />
          </div>
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
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone Number (optional)"
            className={`w-full px-3 py-2 border rounded ${error && 'border-red-500'}`}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              className={`w-full px-3 py-2 pr-10 border rounded ${error && 'border-red-500'}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
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
          </select>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Location (City, State)"
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
            {loading ? 'Creating Account...' : 'Register'}
          </button>
          {!embed && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Already have an account?
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign in here
                </button>
              </div>
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

  // Step 2: Email Verification
  if (step === 2) {
    return (
      <div className={embed ? "" : "min-h-screen flex items-center justify-center bg-gray-100"}>
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4">
          <div className="text-center">
            <Mail className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-700">Verify Your Email</h2>
            <p className="text-sm text-gray-600 mt-2">
              We've sent a 6-digit verification code to <span className="font-semibold">{form.email}</span>
            </p>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}
          
          <div className="flex justify-center space-x-2 my-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !digit && index > 0) {
                    const prevInput = document.getElementById(`otp-${index - 1}`);
                    if (prevInput) prevInput.focus();
                  }
                }}
                maxLength={1}
                className="w-12 h-12 text-center text-lg font-bold border-2 rounded focus:border-green-500 focus:outline-none"
              />
            ))}
          </div>
          
          <button
            onClick={() => handleOtpSubmit()}
            disabled={otpLoading || otp.some(digit => digit === "")}
            className={`w-full py-2 rounded transition duration-150 ease-in-out ${
              otpLoading || otp.some(digit => digit === "")
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {otpLoading ? 'Verifying...' : 'Verify Email'}
          </button>
          
          <div className="text-center space-y-2">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-500">
                Resend code in {resendTimer} seconds
              </p>
            ) : (
              <button
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="inline-flex items-center text-sm text-green-600 hover:text-green-700 disabled:text-gray-400"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${resendLoading ? 'animate-spin' : ''}`} />
                {resendLoading ? 'Sending...' : 'Resend Code'}
              </button>
            )}
            
            <button
              onClick={handleBack}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 mx-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Success
  if (step === 3) {
    return (
      <div className={embed ? "" : "min-h-screen flex items-center justify-center bg-gray-100"}>
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-700">Email Verified!</h2>
          <p className="text-gray-600">
            Your email has been successfully verified. Your account is now pending admin approval.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              You'll receive an email notification once your account is approved. This usually takes 1-2 business days.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Redirecting to login in a few seconds...
          </p>
        </div>
      </div>
    );
  }
}

export default Register;
