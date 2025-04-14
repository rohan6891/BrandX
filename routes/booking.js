const express = require('express');
const multer = require('multer');
const path = require('path');
const DailyBookings = require('../models/DailyBookings');

const router = express.Router();

// Multer setup for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp4', '.mov', '.avi'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Helper: Generate all possible slots (8:30 AM to 10:45 PM, 15-min intervals)
const generateAllSlots = () => {
  const slots = [];
  let hour = 8;
  let minute = 30;
  while (hour <= 22 || (hour === 22 && minute <= 45)) {
    const period = hour < 12 ? 'AM' : hour < 24 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    slots.push(`${displayHour}:${displayMinute} ${period}`);
    minute += 15;
    if (minute >= 60) {
      minute -= 60;
      hour++;
    }
  }
  return slots;
};

// Get available slots for a given date
router.get('/slots/:date', async (req, res) => {
    console.log("request received");
    console.log(req);
  try {
    const { date } = req.params; // Expected format: YYYY-MM-DD
    const dailyBookings = await DailyBookings.findOne({ date });
    const allSlots = generateAllSlots();
    let availableSlots = allSlots;

    if (dailyBookings) {
      const bookedSlots = dailyBookings.bookings.map(booking => booking.timestamp);
      availableSlots = allSlots.map(slot => ({
        time: slot,
        isBooked: bookedSlots.includes(slot)
      }));
    } else {
      availableSlots = allSlots.map(slot => ({
        time: slot,
        isBooked: false
      }));
    }

    res.json(availableSlots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a booking
router.post('/book', upload.single('video'), async (req, res) => {
  try {
    const { date, timestamp } = req.body;
    const video = req.file;

    if (!video || !date || !timestamp) {
      return res.status(400).json({ error: 'Video, date, and timestamp are required' });
    }

    let dailyBookings = await DailyBookings.findOne({ date });

    if (!dailyBookings) {
      dailyBookings = new DailyBookings({ date, bookings: [] });
    }

    // Check if timestamp is already booked
    if (dailyBookings.bookings.some(booking => booking.timestamp === timestamp)) {
      return res.status(400).json({ error: 'Timestamp already booked' });
    }

    dailyBookings.bookings.push({
      timestamp,
      videoPath: video.path
    });

    await dailyBookings.save();
    res.json({ message: 'Booking created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;