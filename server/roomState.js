const DEFAULT_PERMISSIONS = Object.freeze({ screen: false, notes: false });

function ensureRoomState(rooms, roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      participants: [],
      notes: null,
      screenShareActive: false,
      hostId: null,
      permissions: {}
    };
  }

  return rooms[roomId];
}

function addParticipant(rooms, roomId, socketId) {
  const roomState = ensureRoomState(rooms, roomId);

  if (!roomState.participants.includes(socketId)) {
    roomState.participants.push(socketId);
  }

  if (!roomState.hostId && roomState.participants.length === 1) {
    roomState.hostId = socketId;
  }

  if (!roomState.permissions[socketId]) {
    roomState.permissions[socketId] = { ...DEFAULT_PERMISSIONS };
  }

  return roomState;
}

function setParticipantPermission(rooms, roomId, socketId, type, value) {
  const roomState = ensureRoomState(rooms, roomId);

  if (!roomState.permissions[socketId]) {
    roomState.permissions[socketId] = { ...DEFAULT_PERMISSIONS };
  }

  roomState.permissions[socketId][type] = Boolean(value);
  return roomState;
}

function removeParticipant(rooms, roomId, socketId) {
  const roomState = ensureRoomState(rooms, roomId);

  roomState.participants = roomState.participants.filter((id) => id !== socketId);
  delete roomState.permissions[socketId];

  if (roomState.hostId === socketId) {
    roomState.hostId = roomState.participants[0] || null;
  }

  return roomState;
}

function canUseFeature(roomState, socketId, feature) {
  if (!roomState) return false;

  if (roomState.hostId === socketId) return true;

  const permissions = roomState.permissions[socketId] || { ...DEFAULT_PERMISSIONS };
  return !!permissions[feature];
}

module.exports = {
  DEFAULT_PERMISSIONS,
  ensureRoomState,
  addParticipant,
  setParticipantPermission,
  removeParticipant,
  canUseFeature
};
