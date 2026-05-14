const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// @route   POST /api/auth/register
// @access  Public
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
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: user.toPublic(),
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
// @access  Public
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

    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: user.toPublic(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/google
// @access  Public
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
      user: user.toPublic(),
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
};

// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user: user.toPublic() });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { username, bio, avatar, statusMessage } = req.body;
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
    if (statusMessage !== undefined) updateFields.statusMessage = statusMessage;

    const user = await User.findByIdAndUpdate(req.user.id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user: user.toPublic() });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    console.error('UpdateProfile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/auth/by-username/:username
// @access  Public
exports.getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: user.toPublic() });
  } catch (error) {
    console.error('GetUserByUsername error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};
