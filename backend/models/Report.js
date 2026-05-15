const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  category: {
    type: String,
    enum: ['bug', 'content', 'moderation'],
    required: [true, 'Please select a category'],
  },
  details: {
    type: String,
    required: [true, 'Please provide details'],
    trim: true,
    maxlength: 2000,
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
