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
const rooms = {};
const roomNotes = {}; // Store notes for each room

io.on("connection", (socket) => {

    socket.on("join-room", (roomId) => {

        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = [];
            roomNotes[roomId] = null;
        }

        const others = rooms[roomId];

        socket.emit("existing-users", others);

        // Send current room notes to new user if available
        if (roomNotes[roomId]) {
            socket.emit("receive-notes", roomNotes[roomId]);
        }

        rooms[roomId].push(socket.id);

        socket.to(roomId).emit("user-joined", socket.id);

        socket.on("disconnect", () => {

            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(
                    id => id !== socket.id
                );
            }

            socket.to(roomId).emit(
                "user-left",
                socket.id
            );
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

    // Handle notes sharing
    socket.on("share-notes", ({ roomId, fileName, content }) => {
        // Store notes for the room
        roomNotes[roomId] = {
            fileName: fileName,
            content: content,
            sharedBy: socket.id,
            timestamp: new Date().getTime()
        };

        // Broadcast notes to all users in the room
        io.to(roomId).emit("receive-notes", roomNotes[roomId]);
    });

});

// START SERVER
const PORT = process.env.PORT || 3030;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
