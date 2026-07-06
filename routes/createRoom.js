const router = require("express").Router();

router.post("/createRoom", (req, res) => {
    const roomCode = Math.floor(10000 + Math.random() * 90000);

    res.status(200).json({
        success: true,
        roomCode: roomCode,
        roomUrl: `/room.html?room=${roomCode}`
    });
});

module.exports = router;
