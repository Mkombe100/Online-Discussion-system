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
      return res.status(400).send("User not found");
    }

    const user = result.rows[0];

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).send("Invalid password");
    }

     return res.redirect("/dashboard");
     
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;