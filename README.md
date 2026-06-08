# KIMBWETA ONLINE

A simple real-time video calling application built with **WebRTC**, **Socket.IO**, **Node.js**, and **Express**. Users can create or join rooms and communicate through peer-to-peer video and audio streaming directly in the browser.

---

## Features

* Real-time video and audio calling
* Room-based communication
* WebRTC peer-to-peer connection
* Socket.IO signaling server
* Responsive UI
* Camera and microphone access
* Works on desktop and mobile browsers
* TURN/STUN server support

---

## Technologies Used

* HTML5
* CSS3
* JavaScript
* Node.js
* Express.js
* Socket.IO
* WebRTC

---

## Project Structure

```bash
project-folder/
│
├── server.js
├── package.json
├── public/
│   ├── index.html
│   ├── room.html
│   ├── styles.css
│   ├── room.js
│   └── app.js
│
└── README.md
```

---

### Install Dependencies

```bash
npm install
```

---

## Running the Application

Start the server:

```bash
node server.js
```

or

```bash
npm start
```

The application will run on:

```bash
http://localhost:3000
```

---

## TURN/STUN Configuration

WebRTC requires STUN/TURN servers for better connectivity across different networks.

Example configuration:

```javascript
const peerConnection = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "YOUR_USERNAME",
      credential: "YOUR_CREDENTIAL",
    },
  ],
});
```

---

## How It Works

1. User creates or joins a room
2. Socket.IO exchanges signaling data
3. WebRTC establishes peer-to-peer connection
4. Video and audio streams are shared between users

---

## Browser Support

Supported browsers:

* Google Chrome
* Microsoft Edge
* Firefox
* Brave
* Opera

---

## Future Improvements

* Screen sharing
* Chat messaging
* Recording calls
* Authentication system
* Better UI/UX
* Mobile app version
*Electroic noteBook
---

## EXAMPLE ROOM

```bash
screenshots/home.png
screenshots/video-room.png
```

---

## License

This project is licensed under the MIT License.

---

## Author

Developed by Muksini Mkombe.
