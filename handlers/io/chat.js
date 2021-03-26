//not implementet
io.on('connection', (socket) => {
  user = socket.request.user;
  console.log('user connected');
  socket.on('chat message', async (msg) => {
    const doc = MessageModel({
      userId: user._id,
      channel: 'nackademin',
      message: msg,
    });
    console.log(doc);
    await doc.save();
    io.emit('chat message', msg, user.name);
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});
