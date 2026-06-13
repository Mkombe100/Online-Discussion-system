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

/* TURN + STUN CONFIG */
const config = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
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

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }

  if (screenStream) {
    screenStream.getTracks().forEach((track) => track.stop());
  }

  Object.values(peers).forEach((peer) => peer.close());
  socket.disconnect();
  window.location.href = "/dashboard";
}

function replaceVideoTrack(newTrack) {
  Object.values(peers).forEach((peer) => {
    const sender = peer.getSenders().find((item) => item.track && item.track.kind === "video");

    if (sender) {
      sender.replaceTrack(newTrack);
    }
  });
}

async function startScreenShare() {
  if (!navigator.mediaDevices.getDisplayMedia) {
    alert("Screen sharing is not supported in this browser");
    return;
  }

  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    replaceVideoTrack(screenTrack);
    localVideo.srcObject = screenStream;
    screenBtn.classList.add("active-off");
    screenBtn.querySelector("span").textContent = "Stop";

    screenTrack.onended = stopScreenShare;
  } catch (err) {
    console.log("Screen share error:", err);
  }
}

function stopScreenShare() {
  if (!screenStream || !localStream) return;

  screenStream.getTracks().forEach((track) => track.stop());
  screenStream = null;

  const cameraTrack = localStream.getVideoTracks()[0];
  replaceVideoTrack(cameraTrack);
  localVideo.srcObject = localStream;
  screenBtn.classList.remove("active-off");
  screenBtn.querySelector("span").textContent = "Share";
}

/* GET CAMERA + MIC */
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    localStream = stream;

    localVideo.srcObject = stream;
    hideCameraMessage();

    socket.emit("join-room", roomId);
  })
  .catch((err) => {
    console.log("Camera error:", err);
    setCameraMessage("Camera or microphone permission is needed to join.");
  });

/* CREATE VIDEO ELEMENT */
function createVideo(id) {
  const video = document.createElement("video");

  video.autoplay = true;
  video.playsInline = true;
  video.className = "part-videos";
  video.id = id;

  // Click participant video to expand
  video.addEventListener("click", () => {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  });

  participants.appendChild(video);
  updateParticipantCount();

  return video;
}
/* CREATE PEER CONNECTION */
function createPeer(id) {
  const pc = new RTCPeerConnection(config);

  /* SEND LOCAL TRACKS */
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  /* RECEIVE REMOTE VIDEO */
  pc.ontrack = (event) => {
    if (!videoSlots[id]) {
      videoSlots[id] = createVideo(id);
    }

    videoSlots[id].srcObject = event.streams[0];
  };

  /* SEND ICE CANDIDATES */
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

/* EXISTING USERS */
socket.on("existing-users", async (users) => {
  users = users.slice(0, 3);

  for (let id of users) {
    const pc = createPeer(id);

    peers[id] = pc;

    const offer = await pc.createOffer();

    await pc.setLocalDescription(offer);

    socket.emit("offer", {
      to: id,
      offer,
    });
  }
});

/* NEW USER JOINED */
socket.on("user-joined", (id) => {
  if (Object.keys(peers).length >= 3) return;

  peers[id] = createPeer(id);
  updateParticipantCount();
});

/* RECEIVE OFFER */
socket.on("offer", async ({ from, offer }) => {
  const pc = createPeer(from);

  peers[from] = pc;

  await pc.setRemoteDescription(
    new RTCSessionDescription(offer)
  );

  const answer = await pc.createAnswer();

  await pc.setLocalDescription(answer);

  socket.emit("answer", {
    to: from,
    answer,
  });
});

/* RECEIVE ANSWER */
socket.on("answer", async ({ from, answer }) => {
  if (peers[from]) {
    await peers[from].setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }
});

/* RECEIVE ICE CANDIDATE */
socket.on("ice-candidate", async ({ from, candidate }) => {
  if (peers[from]) {
    try {
      await peers[from].addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    } catch (err) {
      console.log("ICE error:", err);
    }
  }
});

/* USER LEFT */
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
  if (!localStream) return;

  const audioTrack = localStream.getAudioTracks()[0];
  if (!audioTrack) return;

  audioTrack.enabled = !audioTrack.enabled;
  updateButtonState(
    muteBtn,
    audioTrack.enabled,
    "fa-solid fa-microphone",
    "fa-solid fa-microphone-slash",
    "Mic",
    "Muted"
  );
});

cameraBtn.addEventListener("click", () => {
  if (!localStream) return;

  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return;

  videoTrack.enabled = !videoTrack.enabled;
  updateButtonState(
    cameraBtn,
    videoTrack.enabled,
    "fa-solid fa-video",
    "fa-solid fa-video-slash",
    "Camera",
    "Off"
  );
});

screenBtn.addEventListener("click", () => {
  if (screenStream) {
    stopScreenShare();
  } else {
    startScreenShare();
  }
});

copyLinkBtn.addEventListener("click", copyInviteLink);
copyLinkBtnFooter.addEventListener("click", copyInviteLink);
leaveBtn.addEventListener("click", leaveRoom);

updateParticipantCount();
