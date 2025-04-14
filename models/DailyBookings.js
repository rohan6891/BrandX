const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  timestamp: { type: String, required: true },
  videoPath: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const dailyBookingsSchema = new mongoose.Schema({
  date: { 
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true 
  },
  bookings: [bookingSchema]
});

module.exports = mongoose.model('DailyBookings', dailyBookingsSchema);