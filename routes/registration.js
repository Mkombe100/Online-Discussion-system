const router = require('express').Router();
const db = require('../configuration/databaseConnection');
const bcrypt = require('bcrypt');

router.post("/sign-up", async (req, res) => {
  const { f_name, l_name, email, p_number, password } = req.body;

  // Validation
  if (!f_name || !l_name || !email || !p_number || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "All fields are required" 
    });
  }

  try {
    // Check if user already exists
    const userExists = await db.query(
      'SELECT email FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    await db.query(
      'INSERT INTO users(first_name, last_name, phone_no, email, password) VALUES ($1, $2, $3, $4, $5)',
      [f_name, l_name, p_number, email, hashedPassword]
    );

    // Send success response
    return res.status(201).json({ 
      success: true, 
      message: "Sign up successful! Redirecting to login..." 
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Registration failed. Please try again." 
    });
  }
});

module.exports = router;
