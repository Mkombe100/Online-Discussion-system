const router = require('express').Router();

router.post("/createRoom", async (req, res) => {
  const roomCode = Math.floor(10000 + Math.random() * 90000);

  res.redirect(`/room.html?room=${roomCode}`);
});

module.exports = router;
