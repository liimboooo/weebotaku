const Report = require('../models/Report');

exports.createReport = async (req, res) => {
  try {
    const { category, details } = req.body;
    if (!category || !details) {
      return res.status(400).json({ success: false, message: 'Category and details are required' });
    }
    const report = await Report.create({
      user: req.user ? req.user._id : null,
      category,
      details,
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('Create report error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find().populate('user', 'username avatar').sort('-createdAt');
    res.json({ success: true, data: reports });
  } catch (err) {
    console.error('Get reports error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Update report error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
