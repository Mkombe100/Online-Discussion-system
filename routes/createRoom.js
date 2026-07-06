const router = require('express').Router();

router.post("/createRoom", async (req, res) => {
  const roomCode = Math.floor(10000 + Math.random() * 90000);

  // Return JSON so the client can handle redirect and mark itself as creator
  res.json({
    success: true,
    roomCode,
    roomUrl: `/room.html?room=${roomCode}`
  });
});

module.exports = router;
