const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const session = require("express-session");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===== SESSION SETUP =====
app.use(session({
  secret: "your_secret_key_here",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'public'));

// Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const register = require('../routes/registration');
const login = require('../routes/log-in');
const createRoom = require('../routes/createRoom');
const createGroup = require('../routes/createGroup');

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Static files
app.use(express.static("public", { index: false }));

// ===== SOCKET.IO =====
const rooms = {};

io.on("connection", (socket) => {

  socket.on("join-room", (roomId) => {

    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    const others = rooms[roomId];

    socket.emit("existing-users", others);

    rooms[roomId].push(socket.id);

    socket.to(roomId).emit("user-joined", socket.id);

    socket.on("disconnect", () => {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);
    });

  });

  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

});

// ===== ROUTES =====
app.use(register);

app.get('/sign-up', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'registration.html'));
});

app.use(login);

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login'); // or send login page
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.render('dashboard', {
    username: req.session.user.username
  });
});

app.use(createGroup);

app.get('/createRoom', (req, res) => {
  res.render('dashboard');  // ONLY CHANGE: changed from sendFile with .html to render with .ejs
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3030;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
