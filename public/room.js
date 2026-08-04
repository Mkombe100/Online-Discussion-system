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
const shareNotesBtn = document.getElementById("shareNotesBtn");   // new
const pdfInput = document.getElementById("pdfFile");              // new (hidden input)
const pdfViewer = document.getElementById("pdfViewer");           // new
const screenViewer = document.getElementById("screenViewer");     // new (optional big view)
const settingBtn = document.getElementById("setting");            // gear icon
const copyLinkBtn = document.getElementById("copyLinkBtn");
const copyLinkBtnFooter = document.getElementById("copyLinkBtnFooter");
const leaveBtn = document.getElementById("leaveBtn");

let localStream;
let screenStream;
let peers = {};
let videoSlots = {};
let isHost = false;
let hostId = null;
let permissions = {}; // { [socketId]: { screen: bool, notes: bool } }

const config = {
  iceServers: [
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "ddbaf0b8d0faa3e841f1fc5d",
      credential: "sYhaMzJqs7PGMRs8",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "ddbaf0b8d0faa3e841f1fc5d",
      credential: "sYhaMzJqs7PGMRs8",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "ddbaf0b8d0faa3e841f1fc5d",
      credential: "sYhaMzJqs7PGMRs8",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "ddbaf0b8d0faa3e841f1fc5d",
      credential: "sYhaMzJqs7PGMRs8",
    },
  ],
};

const roomId =
  new URLSearchParams(window.location.search).get("room") || "test";
if (roomCodeLabel) roomCodeLabel.textContent = roomId;

/* ---------- helpers ---------- */
function updateParticipantCount() {
  const count = Object.keys(peers).length + 1;
  if (participantCount) participantCount.textContent = count;
  if (remoteCount) remoteCount.textContent = `${count - 1} online`;
}

function updateButtonState(button, enabled, onIcon, offIcon, onLabel, offLabel) {
  if (!button) return;
  const icon = button.querySelector("i");
  const label = button.querySelector("span");
  button.classList.toggle("active-off", !enabled);
  if (icon) icon.className = enabled ? onIcon : offIcon;
  if (label) label.textContent = enabled ? onLabel : offLabel;
}

function setCameraMessage(message) {
  if (!cameraMessage) return;
  cameraMessage.textContent = message;
  cameraMessage.classList.remove("hidden");
}
function hideCameraMessage() {
  if (cameraMessage) cameraMessage.classList.add("hidden");
}

async function copyInviteLink() {
  const inviteLink = `${window.location.origin}/room.html?room=${encodeURIComponent(roomId)}`;
  try {
    await navigator.clipboard.writeText(inviteLink);
    alert("Invite link copied");
  } catch (err) {
    prompt("Copy this invite link", inviteLink);
  }
}

function leaveRoom() {
  if (!confirm("Are you sure you want to leave this room?")) return;
  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
  Object.values(peers).forEach((peer) => peer.close());
  socket.disconnect();
  window.location.href = "/dashboard";
}

function replaceVideoTrack(newTrack) {
  Object.values(peers).forEach((peer) => {
    const sender = peer.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender) sender.replaceTrack(newTrack);
  });
}

/* ---------- permission helpers ---------- */
function canShareScreen() {
  if (isHost) return true;
  return !!(permissions[socket.id] && permissions[socket.id].screen);
}
function canShareNotes() {
  if (isHost) return true;
  return !!(permissions[socket.id] && permissions[socket.id].notes);
}

function broadcastPermissions() {
  socket.emit("update-permissions", { roomId, permissions });
}

/* ---------- screen share ---------- */
async function startScreenShare() {
  if (!canShareScreen()) {
    alert("You do not have permission to share screen.\nAsk the room creator to enable it in Settings.");
    return;
  }
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    // send screen to all peers
    replaceVideoTrack(screenTrack);

    // local preview
    localVideo.srcObject = screenStream;

    // optional big ViewPoint
    if (screenViewer) {
      if (pdfViewer) pdfViewer.style.display = "none";
      screenViewer.style.display = "block";
      screenViewer.srcObject = screenStream;
    }

    if (screenBtn) {
      screenBtn.classList.add("active-off");
      const span = screenBtn.querySelector("span");
      if (span) span.textContent = "Stop";
    }

    socket.emit("screen-share-state", { roomId, active: true, from: socket.id });

    screenTrack.onended = stopScreenShare;
  } catch (err) {
    console.log(err);
  }
}

function stopScreenShare() {
  if (!screenStream || !localStream) return;

  screenStream.getTracks().forEach((t) => t.stop());
  screenStream = null;

  const cameraTrack = localStream.getVideoTracks()[0];
  if (cameraTrack) replaceVideoTrack(cameraTrack);
  localVideo.srcObject = localStream;

  if (screenViewer) {
    screenViewer.srcObject = null;
    screenViewer.style.display = "none";
    if (pdfViewer) pdfViewer.style.display = "block";
  }

  if (screenBtn) {
    screenBtn.classList.remove("active-off");
    const span = screenBtn.querySelector("span");
    if (span) span.textContent = "Share";
  }

  socket.emit("screen-share-state", { roomId, active: false, from: socket.id });
}

/* ---------- notes / PDF share ---------- */
function showPdf(dataUrl) {
  if (!pdfViewer) return;
  const url = typeof dataUrl === "string" ? dataUrl : dataUrl?.dataUrl || "";
  if (!url) {
    pdfViewer.src = "about:blank";
    return;
  }
  if (screenViewer) screenViewer.style.display = "none";
  pdfViewer.style.display = "block";
  pdfViewer.src = url;
}

if (shareNotesBtn && pdfInput) {
  shareNotesBtn.addEventListener("click", () => {
    if (!canShareNotes()) {
      alert("You do not have permission to share notes.\nAsk the room creator to enable it in Settings.");
      return;
    }
    pdfInput.click();
  });

  pdfInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please choose a PDF.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const noteData = {
        fileName: file.name,
        mimeType: file.type,
        dataUrl: reader.result,
      };
      socket.emit("share-notes", { roomId, noteData });
      showPdf(noteData.dataUrl);
    };
    reader.onerror = () => alert("Could not load this PDF. Try a smaller file.");
    reader.readAsDataURL(file);
  });
}

/* ---------- media start ---------- */
navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then((stream) => {
    localStream = stream;
    localVideo.srcObject = stream;
    localVideo.muted = true;
    localVideo.playsInline = true;
    localVideo.setAttribute("playsinline", "");
    localVideo.play().catch(() => {});
    hideCameraMessage();
    socket.emit("join-room", roomId);
  })
  .catch((err) => {
    console.log(err);
    setCameraMessage("Camera or microphone permission is needed.");
  });

/* ---------- video tile helpers ---------- */
function createVideo(id) {
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.className = "part-videos";
  video.id = id;

  video.addEventListener("dblclick", async () => {
    try {
      if (video.requestFullscreen) await video.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (err) {
      console.log(err);
    }
  });

  if (participants) participants.appendChild(video);
  updateParticipantCount();
  return video;
}

function createPeer(id) {
  const pc = new RTCPeerConnection(config);

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }

  // if we are already screen-sharing, give the new peer the screen track
  if (screenStream) {
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender && screenTrack) sender.replaceTrack(screenTrack);
  }

  pc.ontrack = (event) => {
    const stream = event.streams && event.streams[0];
    if (!stream) return;
    if (!videoSlots[id]) videoSlots[id] = createVideo(id);
    const video = videoSlots[id];
    video.srcObject = stream;
    video.play().catch(() => {});
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { to: id, candidate: event.candidate });
    }
  };

  return pc;
}

/* ---------- socket events ---------- */
socket.on("existing-users", async (users) => {
  users = users.slice(0, 3);
  for (let id of users) {
    if (id === socket.id) continue;
    const pc = createPeer(id);
    peers[id] = pc;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { to: id, offer });
  }
  updateParticipantCount();
});

socket.on("user-joined", (id) => {
  if (Object.keys(peers).length >= 3) return;
  if (peers[id]) return;
  peers[id] = createPeer(id);
  updateParticipantCount();

  // host initialises permissions for the new user (denied by default)
  if (isHost) {
    permissions[id] = { screen: false, notes: false };
    broadcastPermissions();
    renderPermissions();
  }
});

socket.on("offer", async ({ from, offer }) => {
  const pc = createPeer(from);
  peers[from] = pc;
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { to: from, answer });
});

socket.on("answer", async ({ from, answer }) => {
  if (peers[from]) {
    await peers[from].setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on("ice-candidate", async ({ from, candidate }) => {
  if (peers[from]) {
    try {
      await peers[from].addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.log(err);
    }
  }
});

socket.on("user-left", (id) => {
  if (peers[id]) {
    peers[id].close();
    delete peers[id];
  }
  if (videoSlots[id]) {
    videoSlots[id].remove();
    delete videoSlots[id];
  }
  delete permissions[id];
  updateParticipantCount();
  renderPermissions();
});

/* ---------- host + permissions ---------- */
socket.on("host-info", ({ hostId: h }) => {
  hostId = h;
  isHost = h === socket.id;
  renderPermissions();
});

socket.on("permissions-updated", (perms) => {
  permissions = perms || {};
  renderPermissions();
});

socket.on("room-state", ({ notes, hostId: h, permissions: perms }) => {
  if (notes) showPdf(notes.dataUrl);
  if (h) {
    hostId = h;
    isHost = h === socket.id;
  }
  if (perms) permissions = perms;
  renderPermissions();
});

socket.on("notes-updated", (noteData) => {
  if (noteData) showPdf(noteData.dataUrl);
});

socket.on("screen-share-state", ({ active, from }) => {
  if (from === socket.id) return;

  if (active) {
    // show the sharer's stream in the big ViewPoint if available
    const video = videoSlots[from];
    if (video && video.srcObject && screenViewer) {
      if (pdfViewer) pdfViewer.style.display = "none";
      screenViewer.style.display = "block";
      screenViewer.srcObject = video.srcObject;
    }
  } else {
    if (screenViewer) {
      screenViewer.srcObject = null;
      screenViewer.style.display = "none";
      if (pdfViewer) pdfViewer.style.display = "block";
    }
  }
});

/* ---------- settings UI (simple) ---------- */
function renderPermissions() {
  const list = document.getElementById("permList");
  if (!list) return;

  list.innerHTML = "";

  // self
  const selfRow = document.createElement("div");
  selfRow.className = "perm-row";
  selfRow.innerHTML = `
    <div class="name">You ${isHost ? '<span class="host-badge">Host</span>' : ""}
      <small>${socket.id ? socket.id.slice(0, 8) + "…" : ""}</small>
    </div>
    <div class="perm-toggles">
      <label><input type="checkbox" disabled ${canShareScreen() ? "checked" : ""}> Screen</label>
      <label><input type="checkbox" disabled ${canShareNotes() ? "checked" : ""}> Notes</label>
    </div>`;
  list.appendChild(selfRow);

  // others
  Object.keys(videoSlots).forEach((id) => {
    const p = permissions[id] || { screen: false, notes: false };
    const row = document.createElement("div");
    row.className = "perm-row";
    row.innerHTML = `
      <div class="name">Participant
        <small>${id.slice(0, 8)}…</small>
      </div>
      <div class="perm-toggles">
        <label>
          <input type="checkbox" data-id="${id}" data-type="screen" ${p.screen ? "checked" : ""} ${isHost ? "" : "disabled"}>
          Screen
        </label>
        <label>
          <input type="checkbox" data-id="${id}" data-type="notes" ${p.notes ? "checked" : ""} ${isHost ? "" : "disabled"}>
          Notes
        </label>
      </div>`;
    list.appendChild(row);
  });

  if (isHost) {
    list.querySelectorAll('input[type="checkbox"][data-id]').forEach((cb) => {
      cb.onchange = () => {
        const id = cb.dataset.id;
        const type = cb.dataset.type;
        if (!permissions[id]) permissions[id] = { screen: false, notes: false };
        permissions[id][type] = cb.checked;
        broadcastPermissions();
      };
    });
  }

  const banner = document.getElementById("hostBanner");
  const noPerm = document.getElementById("noPermMsg");
  if (banner) banner.style.display = isHost ? "block" : "none";
  if (noPerm) noPerm.style.display = isHost ? "none" : "block";
}

/* open / close settings */
if (settingBtn) {
  settingBtn.addEventListener("click", () => {
    renderPermissions();
    const overlay = document.getElementById("settingsOverlay");
    if (overlay) overlay.classList.add("open");
  });
}
const closeSettings = document.getElementById("closeSettings");
if (closeSettings) {
  closeSettings.onclick = () => {
    const overlay = document.getElementById("settingsOverlay");
    if (overlay) overlay.classList.remove("open");
  };
}

/* ---------- controls ---------- */
if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    updateButtonState(
      muteBtn,
      track.enabled,
      "fa-solid fa-microphone",
      "fa-solid fa-microphone-slash",
      "Mic",
      "Muted"
    );
  });
}

if (cameraBtn) {
  cameraBtn.addEventListener("click", () => {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    updateButtonState(
      cameraBtn,
      track.enabled,
      "fa-solid fa-video",
      "fa-solid fa-video-slash",
      "Camera",
      "Off"
    );
  });
}

if (screenBtn) {
  screenBtn.addEventListener("click", () => {
    if (screenStream) stopScreenShare();
    else startScreenShare();
  });
}

if (copyLinkBtn) copyLinkBtn.addEventListener("click", copyInviteLink);
if (copyLinkBtnFooter) copyLinkBtnFooter.addEventListener("click", copyInviteLink);
if (leaveBtn) leaveBtn.addEventListener("click", leaveRoom);

updateParticipantCount();