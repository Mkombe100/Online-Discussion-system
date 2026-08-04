const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const session = require("express-session");

const register = require('../routes/registration');
const login = require('../routes/log-in');
const createRoom = require('../routes/createRoom');
const createGroup = require('../routes/createGroup');
const {
  ensureRoomState,
  addParticipant,
  setParticipantPermission,
  removeParticipant,
  canUseFeature
} = require('./roomState');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// SESSION
app.use(session({
    secret: "your_secret_key_here",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}));

// EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "public"));

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// STATIC FILES
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

// ROUTES (must be registered after session middleware)
app.use(register);
app.use(login);
app.use(createRoom);
app.use(createGroup);

// HOME
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// SIGN UP
app.get('/sign-up', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'registration.html'));
});

// LOGIN PAGE
app.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// DASHBOARD - render EJS view
app.get('/dashboard', (req, res) => {
  console.log('SESSION:', req.session);

  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  res.render('dashboard', {
    username: req.session.user.username
  });
});

app.get("/room.html", (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    res.sendFile(path.join(__dirname, "..", "public", "room.html"));
});

// USER INFO API
app.get('/api/user', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  res.json({
    name: req.session.user.username,
    email: req.session.user.email,
    initials: req.session.user.username.substring(0, 2).toUpperCase()
  });
});

// CREATE ROOM PAGE
app.get('/createRoom', (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');
  res.render('dashboard', { username: req.session.user.username });
});

// SOCKET.IO
const rooms = {};

function getRoomState(roomId) {
  return ensureRoomState(rooms, roomId);
}

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);

    const roomState = addParticipant(rooms, roomId, socket.id);
    const existingUsers = roomState.participants.filter((id) => id !== socket.id);

    socket.emit('existing-users', existingUsers);
    socket.emit('room-state', {
      notes: roomState.notes,
      screenShareActive: roomState.screenShareActive,
      hostId: roomState.hostId,
      permissions: roomState.permissions
    });
    socket.emit('host-info', { hostId: roomState.hostId });

    socket.to(roomId).emit('user-joined', socket.id);
    socket.to(roomId).emit('host-info', { hostId: roomState.hostId });
    socket.to(roomId).emit('permissions-updated', roomState.permissions);

    socket.on('disconnect', () => {
      const updatedRoomState = removeParticipant(rooms, roomId, socket.id);

      socket.to(roomId).emit('user-left', socket.id);
      socket.to(roomId).emit('host-info', { hostId: updatedRoomState.hostId });
      socket.to(roomId).emit('permissions-updated', updatedRoomState.permissions);
    });
  });

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('update-permissions', ({ roomId, permissions }) => {
    const roomState = getRoomState(roomId);

    if (roomState.hostId !== socket.id) return;

    roomState.permissions = {
      ...roomState.permissions,
      ...(permissions || {})
    };

    io.to(roomId).emit('permissions-updated', roomState.permissions);
  });

  socket.on('share-notes', ({ roomId, noteData }) => {
    const roomState = getRoomState(roomId);

    if (!canUseFeature(roomState, socket.id, 'notes')) return;

    roomState.notes = noteData;
    io.to(roomId).emit('notes-updated', noteData);
  });

  socket.on('screen-share-state', ({ roomId, active }) => {
    const roomState = getRoomState(roomId);

    if (!canUseFeature(roomState, socket.id, 'screen')) return;

    roomState.screenShareActive = active;
    socket.to(roomId).emit('screen-share-state', { active, from: socket.id });
  });
});

const PORT = process.env.PORT || 3030;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
