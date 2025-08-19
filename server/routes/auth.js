const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const protect = require('../middleware/authMiddleware');
const passport = require('../config/passport');
const { generateOTP, sendOTPEmail, sendWelcomeEmail, sendPasswordResetOTP, sendPasswordResetConfirmation } = require('../utils/emailService');

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `profile_${req.user.id}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// @route   POST /api/auth/register
// @desc    Register user and send OTP for email verification
router.post('/register', async (req, res) => {
  const { name, email, password, role, phone, location } = req.body;

  try {
    // Input validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(400).json({ message: 'User with this email already exists and is verified' });
      } else {
        // User exists but email not verified, allow resending OTP
        return res.status(400).json({ 
          message: 'User with this email already exists but email is not verified. Please verify your email or request a new OTP.',
          requiresVerification: true,
          userId: existingUser._id
        });
      }
    }

    // Validate role - Allow admin to create any user type if they're authenticated as admin
    const validRoles = ['farmer', 'transporter', 'warehouse_manager', 'market_vendor'];
    
    // Check if the request is from an authenticated admin (for admin-created users)
    const authHeader = req.headers.authorization;
    let isAdminCreating = false;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'admin') {
          isAdminCreating = true;
        }
      } catch (err) {
        // Token invalid, proceed as normal registration
      }
    }
    
    // If admin is creating user, allow admin role creation, otherwise restrict
    if (!isAdminCreating && role === 'admin') {
      return res.status(400).json({ message: 'Direct admin registration not allowed. Use the create-admin endpoint.' });
    }
    
    if (!isAdminCreating && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // Generate OTP and expiration time
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user with unverified email
    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password: hashedPassword, 
      role,
      phone: phone ? phone.trim() : '',
      location: location ? location.trim() : '',
      emailVerified: false,
      emailVerificationToken: otp,
      emailVerificationExpires: otpExpires,
      approved: false // Will be set after email verification and admin approval
    });

    await user.save();
    
    // Send OTP email
    const emailResult = await sendOTPEmail(user.email, user.name, otp);
    
    if (!emailResult.success) {
      // If email sending fails, delete the user and return error
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again later.',
        error: emailResult.error 
      });
    }
      
    res.status(201).json({ 
      message: 'Registration successful! Please check your email for the verification code.',
      userId: user._id,
      requiresVerification: true,
      emailSent: true
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration. Please try again.' });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with OTP code
router.post('/verify-email', async (req, res) => {
  const { userId, otp } = req.body;

  try {
    // Input validation
    if (!userId || !otp) {
      return res.status(400).json({ message: 'User ID and OTP code are required' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Check if OTP is valid
    if (!user.emailVerificationToken || user.emailVerificationToken !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Check if OTP has expired
    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Verify the email
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name, user.role);

    res.json({
      message: 'Email verified successfully! Your account is now pending admin approval.',
      emailVerified: true,
      requiresApproval: true
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ message: 'Server error during email verification. Please try again.' });
  }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for email verification
router.post('/resend-otp', async (req, res) => {
  const { userId } = req.body;

  try {
    // Input validation
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new OTP and expiration time
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update user with new OTP
    user.emailVerificationToken = otp;
    user.emailVerificationExpires = otpExpires;
    await user.save();

    // Send new OTP email
    const emailResult = await sendOTPEmail(user.email, user.name, otp);
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again later.',
        error: emailResult.error 
      });
    }

    res.json({
      message: 'New verification code sent to your email!',
      emailSent: true
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ message: 'Server error sending verification code. Please try again.' });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email (case insensitive)
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if email is verified (skip for admin users and Google OAuth users)
    if (user.role !== 'admin' && !user.googleId && !user.emailVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email before logging in. Check your email for the verification code.',
        requiresVerification: true,
        userId: user._id
      });
    }

    // Check if user is approved (skip for admin users)
    if (user.role !== 'admin' && !user.approved) {
      return res.status(403).json({ message: 'Your account is pending approval. Please wait for admin approval.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' } // Extended to 7 days for better UX
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        profilePhoto: user.profilePhoto
      },
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login. Please try again.' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP via email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Input validation
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Check if user registered with Google OAuth
    if (user.googleId && !user.password) {
      return res.status(400).json({ 
        message: 'This account was created with Google. Please sign in with Google instead.' 
      });
    }

    // Generate OTP and expiration time
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store reset token in user document
    user.passwordResetToken = otp;
    user.passwordResetExpires = otpExpires;
    await user.save();

    // Send OTP email
    const emailResult = await sendPasswordResetOTP(user.email, user.name, otp);
    
    if (!emailResult.success) {
      // Clear the reset token if email fails
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      
      return res.status(500).json({ 
        message: 'Failed to send reset code. Please try again later.',
        error: emailResult.error 
      });
    }

    res.json({
      message: 'Password reset code sent to your email. The code will expire in 15 minutes.',
      emailSent: true
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// @route   POST /api/auth/verify-reset-otp
// @desc    Verify password reset OTP
router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Input validation
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP code are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if reset token exists
    if (!user.passwordResetToken) {
      return res.status(400).json({ message: 'No password reset request found. Please request a new reset code.' });
    }

    // Check if OTP matches
    if (user.passwordResetToken !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Check if OTP has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      // Clear expired token
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      
      return res.status(400).json({ message: 'Verification code has expired. Please request a new reset code.' });
    }

    res.json({
      message: 'Verification code confirmed. You can now reset your password.',
      verified: true
    });
  } catch (err) {
    console.error('Verify reset OTP error:', err);
    res.status(500).json({ message: 'Server error during verification. Please try again.' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with verified OTP
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Input validation
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP code, and new password are required' });
    }

    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP again for security
    if (!user.passwordResetToken || user.passwordResetToken !== otp) {
      return res.status(400).json({ message: 'Invalid or missing verification code' });
    }

    // Check if OTP has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      // Clear expired token
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();
      
      return res.status(400).json({ message: 'Verification code has expired. Please start the reset process again.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password and clear reset tokens
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Send confirmation email
    await sendPasswordResetConfirmation(user.email, user.name);

    res.json({
      message: 'Password reset successful! You can now log in with your new password.',
      success: true
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error during password reset. Please try again.' });
  }
});

// @route   GET /api/protected
router.get('/', protect, (req, res) => {
  res.json({
    message: 'Access granted to protected route',
    user: req.user // shows token payload
  });
});

// @route   GET /api/auth/users
// @desc    Get all users (Admin only)
router.get('/users', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Get all users excluding passwords
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @route   GET /api/auth/summary
// @desc    Get system summary data (Admin only)
router.get('/summary', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Get counts from various collections
    const userCount = await User.countDocuments();
    
    // Try to get counts from other models, but handle if they don't exist
    let deliveryCount = 0;
    let orderCount = 0;
    let inventoryCount = 0;
    
    try {
      const Delivery = require('../models/Delivery');
      deliveryCount = await Delivery.countDocuments();
    } catch (e) {
      console.log('Delivery model not found or error:', e.message);
    }
    
    try {
      const Order = require('../models/Order');
      orderCount = await Order.countDocuments();
    } catch (e) {
      console.log('Order model not found or error:', e.message);
    }
    
    try {
      const Inventory = require('../models/Inventory');
      inventoryCount = await Inventory.countDocuments();
    } catch (e) {
      console.log('Inventory model not found or error:', e.message);
    }
    
    const summary = {
      users: userCount,
      deliveries: deliveryCount,
      orders: orderCount,
      inventory: inventoryCount
    };
    
    res.json(summary);
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ message: 'Server error fetching summary' });
  }
});

// @route   PUT /api/auth/users/:id/approve
// @desc    Approve a user (Admin only)
router.put('/users/:id/approve', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user approval status
    user.approved = true;
    await user.save();

    res.json({ 
      message: `User ${user.name} has been approved successfully.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: user.approved
      }
    });
  } catch (err) {
    console.error('Error approving user:', err);
    res.status(500).json({ message: 'Server error approving user' });
  }
});

// @route   DELETE /api/auth/users/:id/decline
// @desc    Decline/Delete a user (Admin only)
router.delete('/users/:id/decline', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deletion of admin users
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot decline admin users' });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ 
      message: `User ${user.name} has been declined and removed from the system.`
    });
  } catch (err) {
    console.error('Error declining user:', err);
    res.status(500).json({ message: 'Server error declining user' });
  }
});

// @route   POST /api/auth/create-admin
// @desc    Create a new admin user (Admin only)
router.post('/create-admin', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can create admin accounts.' });
    }

    const { name, email, password, location, phone } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new admin user
    const adminUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      location: location ? location.trim() : 'Head Office',
      phone: phone ? phone.trim() : '',
      approved: true // Admins are automatically approved
    });

    await adminUser.save();

    // Return success response (exclude password)
    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        location: adminUser.location,
        phone: adminUser.phone,
        approved: adminUser.approved,
        createdAt: adminUser.createdAt
      }
    });

  } catch (err) {
    console.error('Error creating admin user:', err);
    res.status(500).json({ message: 'Server error creating admin user. Please try again.' });
  }
});

// @route   GET /api/auth/admins
// @desc    Get all admin users (Admin only)
router.get('/admins', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Get all admin users excluding passwords
    const adminUsers = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });
    
    res.json({
      count: adminUsers.length,
      admins: adminUsers
    });
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ message: 'Server error fetching admin users' });
  }
});

// @route   POST /api/auth/upload-profile-photo
// @desc    Upload profile photo
router.post('/upload-profile-photo', protect, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Construct the URL for the uploaded file
    const profilePhotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    // Update user's profile photo in database
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { profilePhoto: profilePhotoUrl }, 
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Profile photo uploaded successfully',
      profilePhotoUrl: profilePhotoUrl,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (err) {
    console.error('Error uploading profile photo:', err);
    res.status(500).json({ message: 'Server error uploading profile photo' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile (password, photo, etc.)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone, location, currentPassword, newPassword, profilePhoto } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }
      
      // Hash new password
      user.password = await bcrypt.hash(newPassword, 12);
    }

    // Update other fields if provided
    if (name) user.name = name.trim();
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken by another user' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (phone) user.phone = phone.trim();
    if (location) user.location = location.trim();
    if (profilePhoto) user.profilePhoto = profilePhoto;

    await user.save();

    // Return updated user info (excluding password)
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        coordinates: user.coordinates,
        currentLocation: user.currentLocation,
        approved: user.approved,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Google OAuth Routes
// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
router.get('/google', (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'placeholder-google-client-id') {
    return res.status(501).json({ 
      message: 'Google OAuth is not configured on this server. Please contact the administrator.' 
    });
  }
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'placeholder-google-client-id') {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/?error=oauth_not_configured`);
  }
  
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' })(req, res, next);
}, async (req, res) => {
    try {
      const user = req.user;
      
      // Check if user is approved (skip for admin users)
      if (user.role !== 'admin' && !user.approved) {
        // For pending approval, redirect to auth callback with success message instead of error
        const userData = encodeURIComponent(JSON.stringify({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          phone: user.phone,
          profilePhoto: user.profilePhoto,
          approved: false
        }));
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?pendingApproval=true&user=${userData}`);
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );

      // Redirect to frontend with token and user data
      const userData = encodeURIComponent(JSON.stringify({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        profilePhoto: user.profilePhoto
      }));
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}&user=${userData}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_error`);
    }
  }
);

// @route   POST /api/auth/complete-google-profile
// @desc    Complete Google OAuth user profile with role, location, and phone
router.post('/complete-google-profile', async (req, res) => {
  try {
    const { userId, role, location, phone } = req.body;

    // Input validation
    if (!userId || !role || !location || !phone) {
      return res.status(400).json({ 
        message: 'User ID, role, location, and phone number are required' 
      });
    }

    // Validate role
    const validRoles = ['farmer', 'transporter', 'warehouse_manager', 'market_vendor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // Find and update the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user was created via Google OAuth
    if (!user.googleId) {
      return res.status(400).json({ 
        message: 'This endpoint is only for Google OAuth users' 
      });
    }

    // Update user profile
    user.role = role;
    user.location = location.trim();
    user.phone = phone.trim();
    user.approved = false; // Ensure pending approval
    
    await user.save();

    res.json({
      success: true,
      message: 'Profile completed successfully. Your account is pending admin approval.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        approved: user.approved
      }
    });
  } catch (error) {
    console.error('Complete Google profile error:', error);
    res.status(500).json({ message: 'Server error completing profile' });
  }
});

// @route   POST /api/auth/google/mobile
// @desc    Handle Google OAuth for mobile (token exchange)
router.post('/google/mobile', async (req, res) => {
  try {
    const { googleToken } = req.body;
    
    if (!googleToken) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    // Verify Google token with Google API
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    
    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.profilePhoto = picture || user.profilePhoto;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        googleId,
        name,
        email,
        profilePhoto: picture,
        role: 'farmer',
        approved: false
      });
      await user.save();
    }

    // Check if user is approved
    if (user.role !== 'admin' && !user.approved) {
      return res.status(403).json({ 
        message: 'Your account is pending approval. Please wait for admin approval.',
        requiresApproval: true
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        profilePhoto: user.profilePhoto
      },
      message: 'Google login successful'
    });
  } catch (error) {
    console.error('Google mobile auth error:', error);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

// @route   PUT /api/auth/users/:id/location
// @desc    Update user location coordinates (Admin only)
router.put('/users/:id/location', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const userId = req.params.id;
    const { latitude, longitude, address, location } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if this is a location removal request
    if (latitude === null && longitude === null) {
      // Remove location data
      user.coordinates = undefined;
      user.location = '';
      
      await user.save();
      
      return res.json({
        message: 'Location removed successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          coordinates: user.coordinates
        }
      });
    }

    // Validate coordinates for normal updates
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Invalid coordinates provided' });
    }

    // Update user coordinates and location info
    user.coordinates = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || user.coordinates?.address || '',
      lastUpdated: new Date()
    };

    // Update text location if provided
    if (location) {
      user.location = location.trim();
    }

    await user.save();

    res.json({
      message: `Location updated successfully for ${user.name}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        coordinates: user.coordinates
      }
    });
  } catch (err) {
    console.error('Error updating user location:', err);
    res.status(500).json({ message: 'Server error updating user location' });
  }
});

// @route   GET /api/auth/users/:id/location
// @desc    Get user location details (Admin only)
router.get('/users/:id/location', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const userId = req.params.id;
    const user = await User.findById(userId).select('name email role location coordinates currentLocation');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        coordinates: user.coordinates,
        currentLocation: user.currentLocation
      }
    });
  } catch (err) {
    console.error('Error fetching user location:', err);
    res.status(500).json({ message: 'Server error fetching user location' });
  }
});

// @route   GET /api/auth/users/locations
// @desc    Get all users with their location data (Admin only)
router.get('/users/locations', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const { role } = req.query;
    let query = {};
    
    // Filter by role if specified
    if (role && ['farmer', 'warehouse_manager', 'market_vendor', 'transporter'].includes(role)) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('name email role location coordinates currentLocation approved')
      .sort({ role: 1, name: 1 });
    
    // If requesting transporters, also fetch live locations from active deliveries
    let liveTransporterLocations = {};
    if (!role || role === 'transporter') {
      const Delivery = require('../models/Delivery');
      const activeDeliveries = await Delivery.find({
        status: 'in_transit',
        currentLocation: { $exists: true },
        'currentLocation.latitude': { $exists: true },
        'currentLocation.longitude': { $exists: true }
      }).populate('transporter', 'name email').select('transporter currentLocation');
      
      // Create a map of transporter ID to live location
      activeDeliveries.forEach(delivery => {
        if (delivery.transporter && delivery.currentLocation) {
          liveTransporterLocations[delivery.transporter._id.toString()] = {
            latitude: delivery.currentLocation.latitude,
            longitude: delivery.currentLocation.longitude,
            lastUpdated: delivery.currentLocation.lastUpdated,
            isLive: true
          };
        }
      });
    }
    
    res.json({
      count: users.length,
      users: users.map(user => {
        let coordinates = user.coordinates;
        let isLive = false;
        
        // If this is a transporter and we have live location data, use it instead
        if (user.role === 'transporter' && liveTransporterLocations[user._id.toString()]) {
          const liveLocation = liveTransporterLocations[user._id.toString()];
          coordinates = {
            latitude: liveLocation.latitude,
            longitude: liveLocation.longitude,
            lastUpdated: liveLocation.lastUpdated
          };
          isLive = true;
        }
        
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          coordinates: coordinates,
          currentLocation: user.currentLocation,
          approved: user.approved,
          hasCoordinates: !!(coordinates?.latitude && coordinates?.longitude),
          isLive: isLive
        };
      })
    });
  } catch (err) {
    console.error('Error fetching users with locations:', err);
    res.status(500).json({ message: 'Server error fetching users with locations' });
  }
});

// @route   GET /api/auth/users/live-locations
// @desc    Get live transporter locations from active deliveries (Admin only)
router.get('/users/live-locations', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const Delivery = require('../models/Delivery');
    const activeDeliveries = await Delivery.find({
      status: 'in_transit',
      currentLocation: { $exists: true },
      'currentLocation.latitude': { $exists: true },
      'currentLocation.longitude': { $exists: true }
    }).populate('transporter', 'name email role location')
      .populate('farmer', 'name coordinates')
      .select('transporter farmer currentLocation locationHistory pickupLocation dropoffLocation createdAt');
    
    const liveLocations = activeDeliveries.map(delivery => ({
      deliveryId: delivery._id,
      transporter: {
        id: delivery.transporter._id,
        name: delivery.transporter.name,
        email: delivery.transporter.email,
        role: delivery.transporter.role,
        staticLocation: delivery.transporter.location
      },
      farmer: delivery.farmer ? {
        id: delivery.farmer._id,
        name: delivery.farmer.name,
        coordinates: delivery.farmer.coordinates
      } : null,
      currentLocation: {
        latitude: delivery.currentLocation.latitude,
        longitude: delivery.currentLocation.longitude,
        lastUpdated: delivery.currentLocation.lastUpdated
      },
      pickupLocation: delivery.pickupLocation,
      dropoffLocation: delivery.dropoffLocation,
      deliveryStarted: delivery.createdAt,
      locationHistoryCount: delivery.locationHistory ? delivery.locationHistory.length : 0
    }));
    
    res.json({
      count: liveLocations.length,
      liveLocations
    });
  } catch (err) {
    console.error('Error fetching live transporter locations:', err);
    res.status(500).json({ message: 'Server error fetching live transporter locations' });
  }
});

module.exports = router;
