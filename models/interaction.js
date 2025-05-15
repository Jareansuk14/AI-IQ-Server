// models/interaction.js
const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  command: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Command'
  },
  commandText: {
    type: String
  },
  imageId: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String
  },
  processingTime: {
    type: Number // เวลาในการประมวลผลเป็นมิลลิวินาที
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Interaction', InteractionSchema);