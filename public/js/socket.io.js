const socket = io();

const messages = document.getElementById('messages');
var form = document.getElementById('form');
var input = document.getElementById('input');

form.addEventListener('submit', function (e) {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});

socket.on('chat message', (msg, userName) => {
  const item = document.createElement('li');
  const userMsg = `${userName}: ${msg}`;
  item.textContent = userMsg;
  messages.appendChild(item);
});
