const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  // Check if token exists
  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      message: "No token provided" 
    });
  }

  // Check Bearer format
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid token format" 
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || "your_secret_key"
    );
    req.user = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' 
      ? 'Token expired' 
      : 'Invalid token';
    
    return res.status(401).json({ 
      success: false, 
      message 
    });
  }
}

module.exports = auth;
