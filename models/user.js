// models/user.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  lineUserId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String
  },
  pictureUrl: {
    type: String
  },
  firstInteraction: {
    type: Date,
    default: Date.now
  },
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  interactionCount: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('User', UserSchema);