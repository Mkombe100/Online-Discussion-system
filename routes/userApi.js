const router = require('express').Router();
const db = require('../configuration/databaseConnection');
const verifyToken = require('../middleware/authMiddleware');

// Get current logged-in user data
router.get("/api/user", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user data from database
    const result = await db.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const user = result.rows[0];
    
    // Generate initials
    const initials = user.name
      .split(' ')
      .map(word => word[0].toUpperCase())
      .join('')
      .substring(0, 2);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        initials: initials
      }
    });

  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch user data" 
    });
  }
});

// Logout route
router.post("/logout", (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ 
    success: true, 
    message: "Logged out successfully" 
  });
});

module.exports = router;
