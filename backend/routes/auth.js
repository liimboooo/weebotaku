const express = require('express');
const router = express.Router();
const {
  register, login, googleLogin, getMe, getUserByUsername,
  searchUsers, updateProfile, syncProgression,
  updateMangaProgress, updateListStatus, logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.get('/by-username/:username', getUserByUsername);
router.get('/search', searchUsers);
router.put('/updateprofile', protect, updateProfile);
router.post('/sync-progression', protect, syncProgression);
router.put('/manga-progress', protect, updateMangaProgress);
router.put('/list-status', protect, updateListStatus);
router.get('/logout', protect, logout);

module.exports = router;
