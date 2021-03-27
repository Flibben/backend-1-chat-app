const socket = io();

//Message form
const messages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

//Room Form
const roomForm = document.getElementById('room-form');
const roomInput = document.getElementById('room-input');
const roomList = document.getElementById('room-list');

//Chat
//Eventlistener chatt-send
if (chatForm) {
  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (chatInput.value) {
      socket.emit('chat message', chatInput.value);
      chatInput.value = '';
    }
  });
}

//chat-message receievd
socket.on('chat message', (msg, userName) => {
  const item = document.createElement('li');
  const userMsg = `<a href="/profile/${userName}">${userName}</a>: ${msg}`;
  item.innerHTML = userMsg;
  messages.appendChild(item);
});

//load old messages
socket.on('connection', () => {});

//Room
//Eventlistener create roomForm
if (roomForm) {
  roomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (roomInput.value) {
      socket.emit('create room', roomInput.value);
      roomInput.value = '';
    }
  });
}

//New room recieved
socket.on('create room', (room) => {
  if (roomList) {
    const item = document.createElement('li');
    item.innerHTML = `<a id="${room._id}" class="room-list" href="/chatroom/${room.name}?id=${room._id}">${room.name}</a>`;
    roomList.appendChild(item);
  }
});
