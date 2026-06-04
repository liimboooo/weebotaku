const express = require('express');
const router = express.Router();
const {
  register, login, googleLogin, getMe, getUserByUsername,
  searchUsers, updateProfile,
  updateListStatus, logout,
  getSettings, updateSettings, changePassword, deleteAccount,
  setup2FA, verifySetup2FA, disable2FA, verifyLogin2FA, get2FAStatus,
  requestEmailVerify, verifyEmail,
  forgotPassword, resetPassword, validateResetToken,
  getSyncStatus,
  connectMAL, malCallback, disconnectMAL, syncMAL,
  connectAniList, aniListCallback, disconnectAniList, syncAniList,
  updateFavorites,
  exportFavorites,
  importFavorites,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.get('/by-username/:username', getUserByUsername);
router.get('/search', searchUsers);
router.put('/updateprofile', protect, updateProfile);
router.put('/list-status', protect, updateListStatus);
router.get('/logout', protect, logout);

router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);
router.put('/change-password', protect, changePassword);
router.delete('/account', protect, deleteAccount);

router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify-setup', protect, verifySetup2FA);
router.post('/2fa/disable', protect, disable2FA);
const authLimiter = require('express-rate-limit')({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts, try again later' } });
router.post('/2fa/verify-login', authLimiter, verifyLogin2FA);
router.get('/2fa/status', protect, get2FAStatus);

router.post('/email/request-verify', requestEmailVerify);
router.post('/email/verify/:token', verifyEmail);

router.post('/password/forgot', forgotPassword);
router.post('/password/reset/:token', resetPassword);
router.get('/password/reset/:token', validateResetToken);

router.get('/sync/status', protect, getSyncStatus);

router.post('/sync/mal/connect', protect, connectMAL);
router.post('/sync/mal/callback', protect, malCallback);
router.post('/sync/mal/disconnect', protect, disconnectMAL);
router.post('/sync/mal/sync', protect, syncMAL);

router.post('/sync/anilist/connect', protect, connectAniList);
router.post('/sync/anilist/callback', protect, aniListCallback);
router.post('/sync/anilist/disconnect', protect, disconnectAniList);
router.post('/sync/anilist/sync', protect, syncAniList);

router.put('/favorites', protect, updateFavorites);
router.get('/favorites/export', protect, exportFavorites);
router.post('/favorites/import', protect, importFavorites);

module.exports = router;
