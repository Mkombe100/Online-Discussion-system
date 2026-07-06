const router = require('express').Router();

router.post("/createRoom", async (req, res) => {
  const roomCode = Math.floor(10000 + Math.random() * 90000);
  
  res.json({
    success: true,
    roomCode: roomCode,
    roomUrl: `/room.html?room=${roomCode}`
  });
});

router.get("/room.html", (req, res) => {
  const path = require('path');
  res.sendFile(path.join(__dirname, "..", "public", "room.html"));
});

module.exports = router;
