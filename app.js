const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session');
// const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const dotenv = require('dotenv');
const msgSchema = require('./models/Message');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

dotenv.config({ path: './config.env' });

//Passport Config
require('./config/passport')(passport);

// DB Config
const db = process.env.DB_CONNECT;

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

//Store session in MongoStore
// const sessionStore = new MongoStore({
//   mongooseConnection: mongoose.connection,
//   collection: 'sessions',
// });

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));

const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));

io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
  console.log(socket.request.user);
  if (socket.request.user) {
    next();
  } else {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('user connected');
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg, socket.request.user.name);
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 5000;

http.listen(PORT, console.log(`Server started on port: ${PORT}`));
