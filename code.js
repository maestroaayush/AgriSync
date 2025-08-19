import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, Shield, ArrowRight } from "lucide-react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f5f0] to-white px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold font-serif">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in to your Antique Bidderly account
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <button type="button" className="text-xs text-yellow-600 hover:underline">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full border border-gray-300 rounded-md pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center my-4">
          <div className="flex-grow border-t border-gray-200" />
          <span className="mx-2 text-xs text-gray-400 uppercase">Or continue with</span>
          <div className="flex-grow border-t border-gray-200" />
        </div>

        {/* Google Button */}
        <button
          type="button"
          className="w-full border border-gray-300 py-2 rounded-md text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition"
        >
          <svg className="h-4 w-4" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
          Continue with Google
        </button>

        {/* Register */}
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <button className="text-yellow-600 hover:underline">Register</button>
        </div>
      </div>
    </div>
  );
}
