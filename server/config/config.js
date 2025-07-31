const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Base URL for different environments
  apiBaseUrl: process.env.NODE_ENV === 'production' 
    ? process.env.API_BASE_URL 
    : 'http://localhost:5000'
};

// Environment variables are validated in server.js before this config is loaded

module.exports = config;
