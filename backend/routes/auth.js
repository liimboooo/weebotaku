const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, updateProfile);
router.get('/logout', protect, logout);

module.exports = router;
