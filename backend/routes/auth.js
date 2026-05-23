const express = require('express');
const router = express.Router();
const { register, login, googleLogin, getMe, getUserByUsername, searchUsers, updateProfile, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.get('/by-username/:username', getUserByUsername);
router.get('/search', searchUsers);
router.put('/updateprofile', protect, updateProfile);
router.get('/logout', protect, logout);

module.exports = router;
