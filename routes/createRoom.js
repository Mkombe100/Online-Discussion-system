const router = require('express').Router();

router.post('/createRoom', async (req, res) => {
  try {
    const roomCode = Math.floor(10000 + Math.random() * 90000);
    const roomUrl = `/room.html?room=${roomCode}`;

    // Detect AJAX/fetch requests and respond with JSON so client-side code can redirect
    const wantsJson = (req.xhr === true)
      || (req.headers['x-requested-with'] && req.headers['x-requested-with'].toLowerCase() === 'xmlhttprequest')
      || (req.headers.accept && req.headers.accept.includes('application/json'))
      || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));

    if (wantsJson) {
      return res.json({ success: true, roomCode, roomUrl });
    }

    // Fallback: perform a server-side redirect for normal form submissions
    return res.redirect(roomUrl);

  } catch (err) {
    console.error('createRoom error:', err);
    // For AJAX callers return JSON error, otherwise redirect back to dashboard with an error query
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Could not create room' });
    }
    return res.redirect('/dashboard?room=error');
  }
});

module.exports = router;
