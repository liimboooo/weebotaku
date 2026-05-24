const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../emailService');

// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, email, password, passwordConfirm } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({ success: false, message: `A user with that ${field} already exists` });
    }

    const user = await User.create({ username, email, password });

    const token = require('crypto').randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.emailVerified = false;
    await user.save();

    await sendVerificationEmail(email, token, username).catch(err => {
      console.error('Failed to send verification email:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      needsEmailVerification: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    const loginField = email || username;
    if (!loginField || !password) {
      return res.status(400).json({ success: false, message: 'Please provide credentials' });
    }

    const user = await User.findOne({
      $or: [
        { email: loginField.toLowerCase() },
        { username: loginField },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.emailVerified) {
      return res.json({
        success: true,
        needsEmailVerification: true,
        email: user.email,
        message: 'Please verify your email before logging in',
      });
    }

    // Check 2FA
    if (user.settings && user.settings.twoFactorEnabled && user.twoFactorSecret) {
      return res.json({
        success: true,
        requires2FA: true,
        userId: user._id,
        message: '2FA code required',
      });
    }

    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: user.toFullProfile(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/google
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Missing Google credential' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'Google OAuth not configured' });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account has no email' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      let username = (name || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20) || `user${sub.slice(0, 8)}`;

      const existing = await User.findOne({ username });
      if (existing) {
        username = `${username}${Math.floor(Math.random() * 10000)}`;
      }

      user = await User.create({
        username,
        email,
        password: `google_${sub}_${Math.random().toString(36).slice(2)}`,
        avatar: picture || '',
      });
    }

    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: user.toFullProfile(),
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user: user.toFullProfile() });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/auth/updateprofile
exports.updateProfile = async (req, res) => {
  try {
    const { username, bio, avatar, banner, statusMessage, socialLinks } = req.body;
    const updateFields = {};

    if (username !== undefined) {
      if (username !== req.user.username) {
        const existing = await User.findOne({ username });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Username already taken' });
        }
      }
      updateFields.username = username;
    }
    if (bio !== undefined) updateFields.bio = bio;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (banner !== undefined) updateFields.banner = banner;
    if (statusMessage !== undefined) updateFields.statusMessage = statusMessage;
    if (socialLinks !== undefined) updateFields.socialLinks = socialLinks;

    const user = await User.findByIdAndUpdate(req.user.id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user: user.toFullProfile() });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    console.error('UpdateProfile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/sync-progression
exports.syncProgression = async (req, res) => {
  try {
    const { xp, currentStreak, longestStreak, lastActiveDate, lastDailyBonus } = req.body;
    const user = await User.findById(req.user.id);

    const serverXP = user.progression?.xp || 0;
    const clientXP = xp || 0;

    user.progression = {
      xp: Math.max(serverXP, clientXP),
      currentStreak: Math.max(user.progression?.currentStreak || 0, currentStreak || 0),
      longestStreak: Math.max(user.progression?.longestStreak || 0, longestStreak || 0),
      lastActiveDate: lastActiveDate || user.progression?.lastActiveDate || '',
      lastDailyBonus: lastDailyBonus || user.progression?.lastDailyBonus || '',
    };

    await user.save();
    res.json({ success: true, progression: user.progression });
  } catch (error) {
    console.error('SyncProgression error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/auth/manga-progress
exports.updateMangaProgress = async (req, res) => {
  try {
    const { mangaId, chapter } = req.body;
    if (!mangaId) {
      return res.status(400).json({ success: false, message: 'mangaId required' });
    }

    const user = await User.findById(req.user.id);
    user.mangaProgress.set(mangaId, chapter);
    await user.save();

    res.json({ success: true, mangaProgress: Object.fromEntries(user.mangaProgress) });
  } catch (error) {
    console.error('UpdateMangaProgress error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/auth/list-status
exports.updateListStatus = async (req, res) => {
  try {
    const { animeId, listStatus } = req.body;
    if (!animeId || !listStatus) {
      return res.status(400).json({ success: false, message: 'animeId and listStatus required' });
    }

    const user = await User.findById(req.user.id);
    const item = user.watchlist.find(w => w.animeId === parseInt(animeId));
    if (!item) {
      return res.status(404).json({ success: false, message: 'Anime not in watchlist' });
    }

    item.listStatus = listStatus;
    await user.save();

    res.json({ success: true, data: user.watchlist });
  } catch (error) {
    console.error('UpdateListStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/auth/search
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ success: true, users: [] });
    }
    const users = await User.find({ username: { $regex: q.trim(), $options: 'i' } })
      .limit(8)
      .select('username avatar statusMessage bio progression memberSince');
    res.json({ success: true, users: users.map(u => ({
      id: u._id,
      username: u.username,
      avatar: u.avatar,
      statusMessage: u.statusMessage,
      bio: u.bio,
      level: Math.floor(Math.sqrt((u.progression?.xp || 0) / 100)) + 1,
    })) });
  } catch (error) {
    console.error('SearchUsers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/auth/by-username/:username
exports.getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: user.toRemoteProfile() });
  } catch (error) {
    console.error('GetUserByUsername error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/auth/logout
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};

// ─── Settings ────────────────────────────────────────────

// @route   GET /api/auth/settings
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings');
    res.json({ success: true, settings: user.settings });
  } catch (error) {
    console.error('GetSettings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/auth/settings
exports.updateSettings = async (req, res) => {
  try {
    const allowed = [
      'darkMode','fontSize','accentColor','autoNext','skipIntro','skipOutro',
      'showSubtitles','disableAds','showComments','hideNsfw','showMatureWarnings',
      'showEpisodeProgress','showRatingsCards','emailNotifs','newEpisodes',
      'communityActivity','friendsActivity','systemUpdates','weeklyRecs',
      'pushNotifs','newEpisodeAlerts','dms','commentReplies','friendRequests',
      'achievements','newsletterSub','animeRecs','newFeatures','notifFreq',
      'dndMode','dndFrom','dndTo','publicProfile','showWatchlistPublic',
      'allowMessaging','showActivityStatus','showLastActive','defaultDubbed',
      'contentRating','defaultListView','playbackSpeed',
      'autoSyncEpisode','autoSyncInterval','autoSyncStartup','autoSyncShutdown',
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[`settings.${key}`] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('settings');
    res.json({ success: true, settings: user.settings });
  } catch (error) {
    console.error('UpdateSettings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   DELETE /api/auth/account
exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('DeleteAccount error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 2FA ──────────────────────────────────────────────────

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

// @route   POST /api/auth/2fa/setup
exports.setup2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `AnimeWch (${req.user.username})` });
    const user = await User.findById(req.user.id);
    user.twoFactorSecret = secret.base32;
    await user.save();
    const qr = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ success: true, secret: secret.base32, qr });
  } catch (error) {
    console.error('Setup2FA error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/2fa/verify-setup
exports.verifySetup2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Verification code required' });
    const user = await User.findById(req.user.id);
    if (!user.twoFactorSecret) return res.status(400).json({ success: false, message: '2FA not set up yet' });
    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code.replace(/\s/g, ''), window: 1 });
    if (!verified) return res.status(400).json({ success: false, message: 'Invalid code' });
    user.settings.twoFactorEnabled = true;
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
      const hashed = await bcrypt.hash(code, 8);
      codes.push({ plain: code, hashed });
      user.backupCodes.push(hashed);
    }
    await user.save();
    res.json({ success: true, enabled: true, backupCodes: codes.map(c => c.plain) });
  } catch (error) {
    console.error('VerifySetup2FA error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/2fa/disable
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password required' });
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });
    user.settings.twoFactorEnabled = false;
    user.twoFactorSecret = '';
    user.backupCodes = [];
    await user.save();
    res.json({ success: true, enabled: false });
  } catch (error) {
    console.error('Disable2FA error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/2fa/verify-login
exports.verifyLogin2FA = async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ success: false, message: 'User ID and code required' });
    const user = await User.findById(userId);
    if (!user || !user.settings.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA not enabled' });
    const cleanCode = code.replace(/\s/g, '');
    const isValid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: cleanCode, window: 1 });
    if (isValid) {
      const token = user.getSignedJwtToken();
      return res.json({ success: true, token, user: user.toFullProfile() });
    }
    const matchedIndex = user.backupCodes.findIndex(hc => bcrypt.compareSync(cleanCode, hc));
    if (matchedIndex !== -1) {
      user.backupCodes.splice(matchedIndex, 1);
      await user.save();
      const token = user.getSignedJwtToken();
      return res.json({ success: true, token, user: user.toFullProfile(), usedBackup: true });
    }
    res.status(400).json({ success: false, message: 'Invalid code' });
  } catch (error) {
    console.error('VerifyLogin2FA error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/auth/2fa/status
exports.get2FAStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings twoFactorSecret backupCodes');
    res.json({ success: true, enabled: user.settings.twoFactorEnabled, hasSecret: !!user.twoFactorSecret, backupCodeCount: user.backupCodes.length });
  } catch (error) {
    console.error('Get2FAStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Email Verification ──────────────────────────────────

// @route   POST /api/auth/email/request-verify
exports.requestEmailVerify = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.emailVerified) return res.json({ success: true, message: 'Email already verified' });
    const token = require('crypto').randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user.email, token, user.username).catch(err => {
      console.error('Failed to send verification email:', err.message);
    });
    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('RequestEmailVerify error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/email/verify/:token
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({
      emailVerificationToken: req.params.token,
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    user.emailVerified = true;
    user.emailVerificationToken = '';
    user.emailVerificationExpires = null;
    await user.save();
    res.json({ success: true, message: 'Email verified' });
  } catch (error) {
    console.error('VerifyEmail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Password Reset ──────────────────────────────────────

// @route   POST /api/auth/password/forgot
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent' });
    const token = require('crypto').randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendPasswordResetEmail(email, token, user.username).catch(err => {
      console.error('Failed to send password reset email:', err.message);
    });
    res.json({ success: true, message: 'If that email exists, a reset link was sent' });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/password/reset/:token
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    user.password = password;
    user.resetPasswordToken = '';
    user.resetPasswordExpires = null;
    await user.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('ResetPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/auth/password/reset/:token
exports.validateResetToken = async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    res.json({ success: true, valid: true, email: user.email });
  } catch (error) {
    console.error('ValidateResetToken error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── MAL / AniList Sync (OAuth) ──────────────────────────

const Sync = require('../models/Sync');
const malService = require('../services/malService');
const anilistService = require('../services/anilistService');

function mergeIntoWatchlist(existing, incoming) {
  const existingIds = new Set(existing.map(w => w.animeId));
  const added = [];
  const updated = [];
  for (const item of incoming) {
    const idx = existing.findIndex(w => w.animeId === item.animeId);
    if (idx === -1) {
      existing.push({ ...item, addedAt: new Date() });
      added.push(item);
    } else {
      existing[idx].rating = item.rating || existing[idx].rating;
      existing[idx].listStatus = item.listStatus || existing[idx].listStatus;
      updated.push(item);
    }
  }
  return { watchlist: existing, addedCount: added.length, updatedCount: updated.length };
}

// @route   GET /api/auth/sync/status
exports.getSyncStatus = async (req, res) => {
  try {
    const [malSync, aniSync] = await Promise.all([
      Sync.findOne({ userId: req.user.id, service: 'mal' }),
      Sync.findOne({ userId: req.user.id, service: 'anilist' }),
    ]);
    res.json({
      success: true,
      mal: malSync ? {
        connected: true,
        status: malSync.syncStatus,
        lastSynced: malSync.lastSynced,
        username: malSync.username,
        autoSync: malSync.autoSync,
      } : { connected: false },
      anilist: aniSync ? {
        connected: true,
        status: aniSync.syncStatus,
        lastSynced: aniSync.lastSynced,
        username: aniSync.username,
        autoSync: aniSync.autoSync,
      } : { connected: false },
    });
  } catch (error) {
    console.error('GetSyncStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/sync/mal/connect
exports.connectMAL = async (req, res) => {
  try {
    const { url, codeVerifier } = malService.getConnectUrl();
    res.json({ success: true, authUrl: url, codeVerifier });
  } catch (error) {
    console.error('ConnectMAL error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate MAL auth URL' });
  }
};

// @route   POST /api/auth/sync/mal/callback
exports.malCallback = async (req, res) => {
  try {
    const { code, codeVerifier } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Authorization code required' });

    const tokenData = await malService.exchangeCode(code, codeVerifier || code);
    const userInfo = await malService.getUserInfo(tokenData.accessToken);
    const list = await malService.fetchAnimeList(tokenData.accessToken);

    const existing = await Sync.findOne({ userId: req.user.id, service: 'mal' });
    if (existing) {
      existing.accessToken = tokenData.accessToken;
      existing.refreshToken = tokenData.refreshToken || existing.refreshToken;
      existing.expiresAt = tokenData.expiresAt;
      existing.syncStatus = 'syncing';
      existing.username = userInfo.username;
      existing.lastError = '';
      await existing.save();
    } else {
      await Sync.create({
        userId: req.user.id,
        service: 'mal',
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || '',
        expiresAt: tokenData.expiresAt,
        syncStatus: 'syncing',
        username: userInfo.username,
      });
    }

    const user = await User.findById(req.user.id);
    const { watchlist, addedCount, updatedCount } = mergeIntoWatchlist(user.watchlist, list);
    user.watchlist = watchlist;
    await user.save();

    await Sync.updateOne(
      { userId: req.user.id, service: 'mal' },
      { syncStatus: 'synced', lastSynced: new Date() }
    );

    res.json({
      success: true,
      connected: true,
      username: userInfo.username,
      imported: addedCount,
      updated: updatedCount,
      total: list.length,
    });
  } catch (error) {
    await Sync.updateOne(
      { userId: req.user.id, service: 'mal' },
      { syncStatus: 'failed', lastError: error.message }
    ).catch(() => {});
    console.error('MalCallback error:', error);
    res.status(500).json({ success: false, message: error.message || 'MAL callback failed' });
  }
};

// @route   POST /api/auth/sync/mal/disconnect
exports.disconnectMAL = async (req, res) => {
  try {
    const sync = await Sync.findOne({ userId: req.user.id, service: 'mal' });
    if (sync?.accessToken) {
      malService.revokeToken(sync.accessToken).catch(() => {});
    }
    await Sync.deleteOne({ userId: req.user.id, service: 'mal' });
    res.json({ success: true, connected: false });
  } catch (error) {
    console.error('DisconnectMAL error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/sync/mal/sync
exports.syncMAL = async (req, res) => {
  try {
    const sync = await Sync.findOne({ userId: req.user.id, service: 'mal' });
    if (!sync) return res.status(400).json({ success: false, message: 'MAL not connected' });
    if (sync.syncStatus === 'syncing') return res.json({ success: false, message: 'Already syncing...' });

    sync.syncStatus = 'syncing';
    sync.lastError = '';
    await sync.save();

    let accessToken = sync.accessToken;
    const list = await malService.fetchAnimeList(accessToken);

    const user = await User.findById(req.user.id);
    const { watchlist, addedCount, updatedCount } = mergeIntoWatchlist(user.watchlist, list);
    user.watchlist = watchlist;
    await user.save();

    sync.syncStatus = 'synced';
    sync.lastSynced = new Date();
    await sync.save();

    res.json({
      success: true,
      lastSync: sync.lastSynced.toISOString(),
      service: 'mal',
      imported: addedCount,
      updated: updatedCount,
      total: list.length,
    });
  } catch (error) {
    await Sync.updateOne(
      { userId: req.user.id, service: 'mal' },
      { syncStatus: 'failed', lastError: error.message }
    ).catch(() => {});
    console.error('SyncMAL error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Sync failed' });
  }
};

// @route   POST /api/auth/sync/anilist/connect
exports.connectAniList = async (req, res) => {
  try {
    const authUrl = anilistService.getAuthUrl();
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('ConnectAniList error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate AniList auth URL' });
  }
};

// @route   POST /api/auth/sync/anilist/callback
exports.aniListCallback = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Authorization code required' });

    const tokenData = await anilistService.exchangeCode(code);
    const userInfo = await anilistService.getUserInfo(tokenData.accessToken);
    const list = await anilistService.fetchAnimeList(tokenData.accessToken);

    const existing = await Sync.findOne({ userId: req.user.id, service: 'anilist' });
    if (existing) {
      existing.accessToken = tokenData.accessToken;
      existing.refreshToken = tokenData.refreshToken || existing.refreshToken;
      existing.expiresAt = tokenData.expiresAt;
      existing.syncStatus = 'syncing';
      existing.username = userInfo.username;
      existing.lastError = '';
      await existing.save();
    } else {
      await Sync.create({
        userId: req.user.id,
        service: 'anilist',
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken || '',
        expiresAt: tokenData.expiresAt,
        syncStatus: 'syncing',
        username: userInfo.username,
      });
    }

    const user = await User.findById(req.user.id);
    const { watchlist, addedCount, updatedCount } = mergeIntoWatchlist(user.watchlist, list);
    user.watchlist = watchlist;
    await user.save();

    await Sync.updateOne(
      { userId: req.user.id, service: 'anilist' },
      { syncStatus: 'synced', lastSynced: new Date() }
    );

    res.json({
      success: true,
      connected: true,
      username: userInfo.username,
      imported: addedCount,
      updated: updatedCount,
      total: list.length,
    });
  } catch (error) {
    await Sync.updateOne(
      { userId: req.user.id, service: 'anilist' },
      { syncStatus: 'failed', lastError: error.message }
    ).catch(() => {});
    console.error('AniListCallback error:', error);
    res.status(500).json({ success: false, message: error.message || 'AniList callback failed' });
  }
};

// @route   POST /api/auth/sync/anilist/disconnect
exports.disconnectAniList = async (req, res) => {
  try {
    await Sync.deleteOne({ userId: req.user.id, service: 'anilist' });
    res.json({ success: true, connected: false });
  } catch (error) {
    console.error('DisconnectAniList error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/sync/anilist/sync
exports.syncAniList = async (req, res) => {
  try {
    const sync = await Sync.findOne({ userId: req.user.id, service: 'anilist' });
    if (!sync) return res.status(400).json({ success: false, message: 'AniList not connected' });
    if (sync.syncStatus === 'syncing') return res.json({ success: false, message: 'Already syncing...' });

    sync.syncStatus = 'syncing';
    sync.lastError = '';
    await sync.save();

    let accessToken = sync.accessToken;
    if (sync.expiresAt && new Date() > sync.expiresAt && sync.refreshToken) {
      const refreshed = await anilistService.refreshAccessToken(sync.refreshToken);
      accessToken = refreshed.accessToken;
      sync.accessToken = refreshed.accessToken;
      sync.refreshToken = refreshed.refreshToken || sync.refreshToken;
      sync.expiresAt = refreshed.expiresAt;
      await sync.save();
    }

    const list = await anilistService.fetchAnimeList(accessToken);

    const user = await User.findById(req.user.id);
    const { watchlist, addedCount, updatedCount } = mergeIntoWatchlist(user.watchlist, list);
    user.watchlist = watchlist;
    await user.save();

    sync.syncStatus = 'synced';
    sync.lastSynced = new Date();
    await sync.save();

    res.json({
      success: true,
      lastSync: sync.lastSynced.toISOString(),
      service: 'anilist',
      imported: addedCount,
      updated: updatedCount,
      total: list.length,
    });
  } catch (error) {
    await Sync.updateOne(
      { userId: req.user.id, service: 'anilist' },
      { syncStatus: 'failed', lastError: error.message }
    ).catch(() => {});
    console.error('SyncAniList error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Sync failed' });
  }
};

// @route   PUT /api/auth/sync/auto
exports.updateSyncAuto = async (req, res) => {
  try {
    const { service, autoSync } = req.body;
    if (!['mal', 'anilist'].includes(service)) {
      return res.status(400).json({ success: false, message: 'Invalid service' });
    }
    const sync = await Sync.findOne({ userId: req.user.id, service });
    if (!sync) return res.status(400).json({ success: false, message: 'Service not connected' });
    sync.autoSync = !!autoSync;
    await sync.save();
    res.json({ success: true, autoSync: sync.autoSync });
  } catch (error) {
    console.error('UpdateSyncAuto error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
