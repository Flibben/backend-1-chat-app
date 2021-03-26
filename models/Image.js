const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  img: {
    data: Buffer,
    contentType: String,
  },
  user: {
    type: String,
    required: true,
  },
});

module.exports = new mongoose.model('Image', imageSchema);
