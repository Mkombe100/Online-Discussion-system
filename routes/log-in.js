const router = require('express').Router();
const db = require('../configuration/databaseConnection');
const bcrypt = require('bcrypt');

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // find user by email
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const user = result.rows[0];

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid password" 
      });
    }

    // Return success response with redirect info
    return res.status(200).json({ 
      success: true, 
      message: "Login successful",
      redirect: "/dashboard"
    });
      
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Login failed. Please try again." 
    });
  }
});

module.exports = router;
