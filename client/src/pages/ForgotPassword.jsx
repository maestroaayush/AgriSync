import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Shield, RefreshCw, ArrowLeft, Eye, EyeOff, CheckCircle, Lock } from "lucide-react";

function ForgotPassword({ embed = false, onClose, onSwitchToLogin }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");

  // Timer effect for resend OTP
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // Password strength checker
  const checkPasswordStrength = (password) => {
    if (password.length === 0) return "";
    if (password.length < 6) return "weak";
    if (password.length >= 6 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return "strong";
    return "medium";
  };

  // Handle email form submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("http://localhost:5000/api/auth/forgot-password", {
        email
      });
      
      setSuccess(response.data.message);
      setStep(2);
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset code");
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
    
    // Clear errors when user starts typing
    if (error) setError("");
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    setOtpLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/auth/verify-reset-otp", {
        email,
        otp: code
      });
      
      setSuccess(response.data.message);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid verification code");
      setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = (field, value) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (error) setError("");
    
    // Check password strength for new password
    if (field === "newPassword") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate passwords
    if (passwords.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/reset-password", {
        email,
        otp: otp.join(""),
        newPassword: passwords.newPassword
      });
      
      setSuccess(response.data.message);
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        if (embed && onClose) {
          onClose();
          if (onSwitchToLogin) onSwitchToLogin();
        } else {
          navigate("/login");
        }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setResendLoading(true);
    setError("");
    
    try {
      const response = await axios.post("http://localhost:5000/api/auth/forgot-password", {
        email
      });
      
      setSuccess(response.data.message);
      setResendTimer(60);
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend verification code");
    } finally {
      setResendLoading(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setOtp(["", "", "", "", "", ""]);
    } else if (step === 3) {
      setStep(2);
      setPasswords({ newPassword: "", confirmPassword: "" });
    }
    setError("");
    setSuccess("");
  };

  // Step 1: Email Input
  if (step === 1) {
    return (
      <div className={embed ? "" : "min-h-screen flex items-center justify-center bg-gray-100"}>
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Forgot Password</h2>
            <p className="text-sm text-gray-600 mt-2">
              Enter your email address and we'll send you a verification code to reset your password.
            </p>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}
          
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter your email address"
                  className={`w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    error && 'border-red-500'
                  }`}
                  required
                  autoFocus
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded transition duration-150 ease-in-out ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white text-sm font-semibold`}
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
          
          <div className="text-center space-y-2">
            <button
              onClick={() => {
                if (embed && onSwitchToLogin) {
                  onSwitchToLogin();
                } else if (!embed) {
                  navigate("/login");
                }
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Login
            </button>
            
            {embed && (
              <button
                onClick={onClose}
                className="block text-sm text-gray-500 text-center underline w-full mt-2"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <div className={embed ? "" : "min-h-screen flex items-center justify-center bg-gray-100"}>
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4">
          <div className="text-center">
            <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Verify Your Email</h2>
            <p className="text-sm text-gray-600 mt-2">
              We've sent a 6-digit verification code to <span className="font-semibold">{email}</span>
            </p>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}
          
          <form onSubmit={handleOtpSubmit} className="space-y-4">
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
                  className="w-12 h-12 text-center text-lg font-bold border-2 rounded focus:border-blue-500 focus:outline-none"
                />
              ))}
            </div>
            
            <button
              type="submit"
              disabled={otpLoading || otp.some(digit => digit === "")}
              className={`w-full py-2 rounded transition duration-150 ease-in-out ${
                otpLoading || otp.some(digit => digit === "")
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white text-sm font-semibold`}
            >
              {otpLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
          
          <div className="text-center space-y-2">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-500">
                Resend code in {resendTimer} seconds
              </p>
            ) : (
              <button
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
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
              Back to Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Reset Password
  if (step === 3) {
    const passwordsMatch = passwords.newPassword === passwords.confirmPassword;
    const isFormValid = passwords.newPassword.length >= 6 && passwordsMatch;

    return (
      <div className={embed ? "" : "min-h-screen flex items-center justify-center bg-gray-100"}>
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4">
          <div className="text-center">
            <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Reset Password</h2>
            <p className="text-sm text-gray-600 mt-2">
              Enter your new password below
            </p>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}
          
          <form onSubmit={handlePasswordReset} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  placeholder="Enter new password"
                  className={`w-full border border-gray-300 rounded-md pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 ${
                    error && 'border-red-500'
                  }`}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            </div>
            
            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full border rounded-md pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-1 ${
                    passwords.confirmPassword && !passwordsMatch
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : passwords.confirmPassword && passwordsMatch
                      ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwords.confirmPassword && (
                <div className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordsMatch ? (
                    <span className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Passwords match
                    </span>
                  ) : (
                    'Passwords do not match'
                  )}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full py-2 rounded transition duration-150 ease-in-out ${
                loading || !isFormValid
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white text-sm font-semibold`}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
          
          <div className="text-center">
            <button
              onClick={handleBack}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 mx-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Verification
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ForgotPassword;
