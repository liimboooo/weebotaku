const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — require valid JWT
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('username avatar email role').lean();
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (req.user.role === 'banned') {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }
    req.user.id = req.user._id.toString();
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// Optional auth — attach user if token present, but don't block
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username avatar email role').lean();
      if (user) {
        user.id = user._id.toString();
        req.user = user;
      }
    } catch {
      // Invalid token — just continue without user
    }
  }

  next();
};

// Admin only
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Admin access required' });
};
