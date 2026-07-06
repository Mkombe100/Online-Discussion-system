const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const session = require("express-session");

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

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// STATIC FILES
app.use(express.static(path.join(__dirname, "..", "public"), {
    index: false
}));

// ROUTES
const register = require("../routes/registration");
const login = require("../routes/log-in");
const createRoom = require("../routes/createRoom");
const createGroup = require("../routes/createGroup");

app.use(register);
app.use(login);
app.use(createRoom);
app.use(createGroup);

// HOME
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "login.html"));
});

// SIGN UP
app.get("/sign-up", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "registration.html"));
});

// LOGIN PAGE
app.get("/login", (req, res) => {
    if (req.session.user) {
        return res.redirect("/dashboard");
    }

    res.sendFile(path.join(__dirname, "..", "public", "login.html"));
});

// DASHBOARD
app.get("/dashboard", (req, res) => {

    console.log("SESSION:", req.session);

    if (!req.session.user) {
        return res.redirect("/login");
    }

    res.render("dashboard", {
        username: req.session.user.username
    });
});

// USER INFO API
app.get("/api/user", (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            message: "Not logged in"
        });
    }

    res.json({
        name: req.session.user.username,
        email: req.session.user.email,
        initials: req.session.user.username
            .substring(0, 2)
            .toUpperCase()
    });
});

// ROOM PAGE
app.get("/createRoom", (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    res.render("dashboard", {
        username: req.session.user.username
    });
});

// SOCKET.IO
// rooms structure: rooms[roomId] = { owner: socketId|null, participants: [socketId,...], notes: null }
const rooms = {};

io.on("connection", (socket) => {

  socket.on("join-room", (payload) => {
    // payload can be a string roomId or an object { roomId }
    const roomId = typeof payload === "string" ? payload : (payload && payload.roomId) || "test";

    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        owner: socket.id, // first to join becomes owner
        participants: [],
        notes: null
      };
    }

    // Add to participants if not already present
    if (!rooms[roomId].participants.includes(socket.id)) {
      rooms[roomId].participants.push(socket.id);
    }

    // Inform the joining client about current room owner
    socket.emit("room-info", { owner: rooms[roomId].owner });

    // Send existing participants (other than the joining socket)
    const others = rooms[roomId].participants.filter(id => id !== socket.id);
    socket.emit("existing-users", others);

    // Send current room notes to new user if available
    if (rooms[roomId].notes) {
      socket.emit("receive-notes", rooms[roomId].notes);
    }

    // Notify others that a user joined
    socket.to(roomId).emit("user-joined", socket.id);

    socket.on("disconnect", () => {
      if (rooms[roomId]) {
        rooms[roomId].participants = rooms[roomId].participants.filter(id => id !== socket.id);
      }

      socket.to(roomId).emit("user-left", socket.id);

      // If owner left, pick a new owner (first participant) or null
      if (rooms[roomId] && rooms[roomId].owner === socket.id) {
        const nextOwner = rooms[roomId].participants[0] || null;
        rooms[roomId].owner = nextOwner;
        io.to(roomId).emit("owner-changed", { owner: rooms[roomId].owner });
      }
    });
  });

  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", {
      from: socket.id,
      offer
    });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", {
      from: socket.id,
      answer
    });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate
    });
  });

  // Handle notes sharing (host-only)
  socket.on("share-notes", ({ roomId, fileName, content }) => {
    if (!rooms[roomId] || rooms[roomId].owner !== socket.id) {
      socket.emit("action-denied", { message: "Only the room creator can share notes." });
      return;
    }

    rooms[roomId].notes = {
      fileName,
      content,
      sharedBy: socket.id,
      timestamp: Date.now()
    };

    io.to(roomId).emit("receive-notes", rooms[roomId].notes);
  });

});

// START SERVER
const PORT = process.env.PORT || 3030;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
