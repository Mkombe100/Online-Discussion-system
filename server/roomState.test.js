const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureRoomState, addParticipant, setParticipantPermission, removeParticipant } = require('./roomState');

test('assigns the first participant as host and initializes permissions', () => {
  const rooms = {};
  const room = ensureRoomState(rooms, 'room-a');
  const joinedRoom = addParticipant(rooms, 'room-a', 'socket-1');

  assert.equal(joinedRoom.hostId, 'socket-1');
  assert.deepEqual(joinedRoom.permissions['socket-1'], { screen: false, notes: false });
  assert.deepEqual(joinedRoom.participants, ['socket-1']);
});

test('stores permission changes and preserves them for later participants', () => {
  const rooms = {};
  const room = ensureRoomState(rooms, 'room-b');
  addParticipant(rooms, 'room-b', 'host');
  addParticipant(rooms, 'room-b', 'user-2');

  setParticipantPermission(rooms, 'room-b', 'user-2', 'screen', true);
  const updated = rooms['room-b'];

  assert.equal(updated.permissions['user-2'].screen, true);
  assert.equal(updated.permissions['user-2'].notes, false);
});

test('transfers host to the next participant if the host leaves', () => {
  const rooms = {};
  addParticipant(rooms, 'room-c', 'host');
  addParticipant(rooms, 'room-c', 'user-2');

  const updated = removeParticipant(rooms, 'room-c', 'host');

  assert.equal(updated.hostId, 'user-2');
  assert.ok(!updated.permissions.host);
});
