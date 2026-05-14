const express = require('express');
const router = express.Router();
const { register, login, getMe, getUserByUsername, updateProfile, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/by-username/:username', getUserByUsername);
router.put('/updateprofile', protect, updateProfile);
router.get('/logout', protect, logout);

module.exports = router;
