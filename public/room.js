const socket = io();
const localVideo = document.getElementById("localVideo");
const participants = document.getElementById("participants");
const roomCodeLabel = document.getElementById("roomCodeLabel");
const participantCount = document.getElementById("participantCount");
const remoteCount = document.getElementById("remoteCount");
const cameraMessage = document.getElementById("cameraMessage");
const muteBtn = document.getElementById("muteBtn");
const cameraBtn = document.getElementById("cameraBtn");
const screenBtn = document.getElementById("screenBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const copyLinkBtnFooter = document.getElementById("copyLinkBtnFooter");
const leaveBtn = document.getElementById("leaveBtn");
const notesBtn = document.getElementById("notesBtn");
const notesPanel = document.getElementById("notesPanel");
const closeNotesBtn = document.getElementById("closeNotesBtn");
const noteFileInput = document.getElementById("noteFileInput");
const uploadNoteBtn = document.getElementById("uploadNoteBtn");
const notesList = document.getElementById("notesList");
const uploadSection = document.getElementById("uploadSection");

let localStream;
let screenStream;
let peers = {};
let videoSlots = {};
let isRoomCreator = false;
let notes = [];

const config = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "turn:global.relay.metered.ca:80", username: "ddbaf0b8d0faa3e841f1fc5d", credential: "sYhaMzJqs7PGMRs8" },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "ddbaf0b8d0faa3e841f1fc5d", credential: "sYhaMzJqs7PGMRs8" },
    { urls: "turn:global.relay.metered.ca:443", username: "ddbaf0b8d0faa3e841f1fc5d", credential: "sYhaMzJqs7PGMRs8" },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "ddbaf0b8d0faa3e841f1fc5d", credential: "sYhaMzJqs7PGMRs8" },
  ]
};

const roomId = new URLSearchParams(window.location.search).get("room") || "test";
roomCodeLabel.textContent = roomId;

// ... (keep all your existing functions: updateParticipantCount, updateButtonState, copyInviteLink, leaveRoom, etc.)

// Notes Functions
notesBtn.addEventListener("click", () => {
    notesPanel.style.display = "flex";
    renderNotes();
});

closeNotesBtn.addEventListener("click", () => {
    notesPanel.style.display = "none";
});

socket.on("room-creator-status", (status) => {
    isRoomCreator = status;
    uploadSection.style.display = status ? "block" : "none";
});

socket.on("note-received", (note) => {
    notes.push(note);
    if (notesPanel.style.display === "flex") renderNotes();
});

function renderNotes() {
    notesList.innerHTML = notes.length === 0 
        ? `<p style="color:#94a3b8; text-align:center; padding:40px 20px;">No notes shared yet.</p>` 
        : "";

    notes.forEach(note => {
        const div = document.createElement("div");
        div.style.cssText = "background:#334155; padding:14px; margin-bottom:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;";
        div.innerHTML = `
            <div>
                <strong>${note.filename}</strong><br>
                <small style="color:#94a3b8;">${(note.size/1024).toFixed(1)} KB</small>
            </div>
            <a href="${note.data}" download="${note.filename}" style="background:#3b82f6; color:white; padding:10px 16px; border-radius:6px; text-decoration:none;">Download</a>
        `;
        notesList.appendChild(div);
    });
}

uploadNoteBtn.addEventListener("click", () => {
    const file = noteFileInput.files[0];
    if (!file) return alert("Please select a file");

    if (file.size > 10 * 1024 * 1024) return alert("Maximum file size is 10MB");

    const reader = new FileReader();
    reader.onload = () => {
        socket.emit("upload-note", {
            filename: file.name,
            size: file.size,
            data: reader.result
        });
        noteFileInput.value = "";
    };
    reader.readAsDataURL(file);
});

// Keep all your existing WebRTC code below...
// (getUserMedia, createVideo, createPeer, socket listeners, button events, etc.)
