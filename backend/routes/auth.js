const express = require('express');
const router = express.Router();
const {
  register, login, googleLogin, getMe, getUserByUsername,
  searchUsers, updateProfile, syncProgression,
  updateMangaProgress, updateListStatus, logout,
  getSettings, updateSettings, changePassword, deleteAccount, toggle2FA,
  connectMAL, disconnectMAL, syncMAL,
  connectAniList, disconnectAniList, syncAniList,
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

router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);
router.put('/change-password', protect, changePassword);
router.delete('/account', protect, deleteAccount);
router.post('/2fa/toggle', protect, toggle2FA);

router.post('/sync/mal/connect', protect, connectMAL);
router.post('/sync/mal/disconnect', protect, disconnectMAL);
router.post('/sync/mal/sync', protect, syncMAL);
router.post('/sync/anilist/connect', protect, connectAniList);
router.post('/sync/anilist/disconnect', protect, disconnectAniList);
router.post('/sync/anilist/sync', protect, syncAniList);

module.exports = router;
