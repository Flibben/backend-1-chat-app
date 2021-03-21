const mongoose = require('mongoose');

const msgSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
  },
  channel: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
