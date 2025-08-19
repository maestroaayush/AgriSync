const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy - only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && 
    process.env.GOOGLE_CLIENT_ID !== 'placeholder-google-client-id') {
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let existingUser = await User.findOne({ googleId: profile.id });
    
    if (existingUser) {
      return done(null, existingUser);
    }

    // Check if user exists with the same email
    existingUser = await User.findOne({ email: profile.emails[0].value });
    
    if (existingUser) {
      // Link Google account to existing user
      existingUser.googleId = profile.id;
      existingUser.profilePhoto = profile.photos[0]?.value || existingUser.profilePhoto;
      await existingUser.save();
      return done(null, existingUser);
    }

    // Create new user
    const newUser = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      profilePhoto: profile.photos[0]?.value,
      role: 'farmer', // Default role - users can request role changes later
      approved: false, // Admin needs to approve new Google users
      location: '', // Will be filled later by user
      phone: '' // Will be filled later by user
    });

    const savedUser = await newUser.save();
    done(null, savedUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    done(error, null);
  }
}));

} else {
  console.log('Google OAuth not configured - skipping Google strategy initialization');
}

module.exports = passport;
