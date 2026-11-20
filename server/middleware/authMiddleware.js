const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in with a valid doctor account.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await Doctor.findById(decoded.id);

    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Doctor account associated with this token no longer exists.',
      });
    }

    req.user = doctor;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message:
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid authentication token.',
    });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. Only authorized medical experts or administrators may modify validated medical knowledge base entries and rules.',
      });
    }

    next();
  };
}

module.exports = {
  protect,
  authorize,
};
