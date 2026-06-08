const router = require('express').Router();
const db = require('../configuration/databaseConnection');
const bcrypt = require('bcrypt');

router.post("/sign-up", async (req, res) => {
  const { f_name, l_name, email, p_number, password } = req.body;

  try {
    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users(first_name, last_name, phone_no, email, password) VALUES ($1, $2, $3, $4, $5)',
      [f_name, l_name, p_number, email, hashedPassword]
    );

    res.send("Sign up successful");
    return res.redirect("/login");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;