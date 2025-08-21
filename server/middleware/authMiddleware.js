const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch current user data from database to get the latest role
      const user = await User.findById(decoded.id).select('_id name email role location capacityLimit');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Set req.user with current database values
      req.user = {
        id: user._id.toString(),
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,  // This will be the current role from DB, not the cached JWT role
        location: user.location,
        capacityLimit: user.capacityLimit
      };
      
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } else {
    return res.status(401).json({ message: 'No token provided' });
  }
};

module.exports = protect;
