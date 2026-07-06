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

let localStream;
let screenStream;
let peers = {};
let videoSlots = {};

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

roomCodeLabel.textContent = roomId;

function updateParticipantCount() {
  const count = Object.keys(peers).length + 1;
  participantCount.textContent = count;
  remoteCount.textContent = `${count - 1} online`;
}

function updateButtonState(button, enabled, onIcon, offIcon, onLabel, offLabel) {
  const icon = button.querySelector("i");
  const label = button.querySelector("span");

  button.classList.toggle("active-off", !enabled);
  icon.className = enabled ? onIcon : offIcon;
  label.textContent = enabled ? onLabel : offLabel;
}

function setCameraMessage(message) {
  cameraMessage.textContent = message;
  cameraMessage.classList.remove("hidden");
}

function hideCameraMessage() {
  cameraMessage.classList.add("hidden");
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
  const result = confirm("Are you sure you want to leave this room?");
  if (!result) return;

  if (localStream) localStream.getTracks().forEach((t) => t.stop());
  if (screenStream) screenStream.getTracks().forEach((t) => t.stop());

  Object.values(peers).forEach((peer) => peer.close());
  socket.disconnect();

  window.location.href = "/dashboard";
}

function replaceVideoTrack(newTrack) {
  Object.values(peers).forEach((peer) => {
    const sender = peer
      .getSenders()
      .find((s) => s.track && s.track.kind === "video");

    if (sender) sender.replaceTrack(newTrack);
  });
}

async function startScreenShare() {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    replaceVideoTrack(screenTrack);
    localVideo.srcObject = screenStream;

    screenBtn.classList.add("active-off");
    screenBtn.querySelector("span").textContent = "Stop";

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
  replaceVideoTrack(cameraTrack);

  localVideo.srcObject = localStream;

  screenBtn.classList.remove("active-off");
  screenBtn.querySelector("span").textContent = "Share";
}

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
      if (video.requestFullscreen) {
        await video.requestFullscreen();
      }

      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape");
      }
    } catch (err) {
      console.log(err);
    }
  });

  participants.appendChild(video);
  updateParticipantCount();

  return video;
}

function createPeer(id) {
  const pc = new RTCPeerConnection(config);

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    const stream = event.streams && event.streams[0];
    if (!stream) return;

    if (!videoSlots[id]) {
      videoSlots[id] = createVideo(id);
    }

    const video = videoSlots[id];
    video.srcObject = stream;

    video.play().catch(() => {});
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        to: id,
        candidate: event.candidate,
      });
    }
  };

  return pc;
}

socket.on("existing-users", async (users) => {
  users = users.slice(0, 3);

  for (let id of users) {
    const pc = createPeer(id);
    peers[id] = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("offer", { to: id, offer });
  }
});

socket.on("user-joined", (id) => {
  if (Object.keys(peers).length >= 3) return;

  peers[id] = createPeer(id);
  updateParticipantCount();
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
    await peers[from].setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }
});

socket.on("ice-candidate", async ({ from, candidate }) => {
  if (peers[from]) {
    try {
      await peers[from].addIceCandidate(
        new RTCIceCandidate(candidate)
      );
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

  updateParticipantCount();
});

muteBtn.addEventListener("click", () => {
  const track = localStream.getAudioTracks()[0];
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

cameraBtn.addEventListener("click", () => {
  const track = localStream.getVideoTracks()[0];
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

screenBtn.addEventListener("click", () => {
  if (screenStream) stopScreenShare();
  else startScreenShare();
});

copyLinkBtn.addEventListener("click", copyInviteLink);
copyLinkBtnFooter.addEventListener("click", copyInviteLink);
leaveBtn.addEventListener("click", leaveRoom);

updateParticipantCount();
