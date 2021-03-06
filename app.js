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
const Image = require('./models/Image');
const multer = require('multer');
const { ensureAuthenticated } = require('./config/auth');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');

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

//Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now());
  },
});

const upload = multer({ storage: storage });

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));

app.use('/chatroom/:room', ensureAuthenticated, async (req, res) => {
  // let test;
  console.log(req.query.id);
  messageArray = await MessageModel.find({ channel: req.query.id })
    .sort({ date: -1 })
    .limit(10)
    .populate('userId');

  //fixa ordningen p?? det h??r, render k??rs f??re att oldmessages har populerats
  const htmlMessageArray = messageArray
    .map((message) => {
      return `<li><a href="/profile/${message.userId.name}">${message.userId.name}</a>: ${message.message}</li>`;
    })
    .reverse();
  // .join(' ');
  console.log(htmlMessageArray);
  res.render('rooms', { req, htmlMessageArray: htmlMessageArray.join(' ') });
});
// });

app.use('/profile/:id', ensureAuthenticated, async (req, res) => {
  item = await Image.find({ user: req.user._id });
  res.render('profile', { req, item });
});

app.post(
  '/profile',
  ensureAuthenticated,
  upload.single('image'),
  (req, res, next) => {
    const obj = {
      img: {
        data: fs.readFileSync(
          path.join(__dirname + '/public/uploads/' + req.file.filename)
        ),
        contentType: 'image/png',
      },
      user: req.user._id,
    };
    Image.create(obj, async (err, item) => {
      if (err) {
        console.log(err);
      } else {
        await item.save();
        res.redirect(`/profile/${req.user.name}`);
      }
    });
  }
);

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
