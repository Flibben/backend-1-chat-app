const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const MessageModel = require('./models/Message');
const RoomModel = require('./models/Room');
const Room = require('./models/Room');
const { ensureAuthenticated } = require('./config/auth');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

dotenv.config({ path: './config.env' });

//Passport Config
require('./config/passport')(passport);

// DB Config
const db = process.env.DB_CONNECT;

//IO middleware
const sessionMiddleware = session({
  secret: 'backend1',
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);

//Bodyparser
app.use(express.urlencoded({ extended: false }));

//Set public folder
app.use(express.static('public'));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//Connect flash
app.use(flash());

// Global Vars
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

//Connect to Mongo
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected...'))
  .catch((err) => console.log(err));

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));

app.use('/chatroom/:room', ensureAuthenticated, (req, res) => {
  res.render('rooms', { req });
});

app.use('/profile/:id', ensureAuthenticated, (req, res) => {
  res.render('profile', { req });
});

//Inserting passport as IO middleware
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));

io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
  if (socket.request.user) {
    let roomId = socket.handshake.headers.referer.split('=').slice(-1)[0];
    socket.room = roomId;

    next();
  } else {
    next(new Error('unauthorized'));
  }
});

io.on('connection', async (socket) => {
  console.log(`user: ${socket.request.user.name} connected`);
  socket.join(socket.room);

  //Emit found rooms to create list on cliten
  const rooms = await RoomModel.find();
  rooms.forEach((room) => {
    socket.emit('create room', room);
  });

  //Emit and save chat message
  socket.on('chat message', async (msg) => {
    const doc = MessageModel({
      userId: socket.request.user._id,
      channel: socket.room,
      message: msg,
    });

    await doc.save();
    io.to(socket.room).emit('chat message', msg, socket.request.user.name);
  });
  socket.on('disconnect', () => {
    console.log(`user: ${socket.request.user.name} disconnected`);
  });

  socket.on('create room', async (room) => {
    const findDoc = await RoomModel.findOne({ name: room });
    //When findDOc falsy null, save room
    if (!findDoc) {
      const doc = RoomModel({
        name: room,
      });
      await doc.save();
      io.emit('create room', doc);
    } else {
      console.log(`room: ${room} already exists `);
    }
  });
});

const PORT = process.env.PORT || 5000;

http.listen(PORT, console.log(`Server started on port: ${PORT}`));
