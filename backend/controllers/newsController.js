const News = require('../models/News');

const ANILIST_API = process.env.ANILIST_API_URL || 'https://graphql.anilist.co';

const trendingQuery = `
query {
  Page(page: 1, perPage: 20) {
    media(sort: TRENDING_DESC, type: ANIME) {
      id
      title { romaji english }
      description
      bannerImage
      coverImage { large }
      genres
      averageScore
      format
      episodes
    }
  }
}`;

exports.getFeatured = async (req, res) => {
  try {
    const localFeatured = await News.find({ featured: true })
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ success: true, data: localFeatured });
  } catch (error) {
    console.error('GetFeatured error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;

    const query = category ? { category } : {};

    const [news, total] = await Promise.all([
      News.find(query)
        .populate('user', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      News.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: news,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('GetAllNews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
      News.find({ category: req.params.category })
        .populate('user', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      News.countDocuments({ category: req.params.category }),
    ]);

    res.json({
      success: true,
      data: news,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('GetByCategory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('user', 'username avatar');

    if (!news) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }

    res.json({ success: true, data: news });
  } catch (error) {
    console.error('GetNewsById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.likeNews = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }

    const idx = news.likes.indexOf(req.user.id);
    if (idx > -1) {
      news.likes.splice(idx, 1);
    } else {
      news.likes.push(req.user.id);
    }

    await news.save();
    res.json({ success: true, data: news, liked: idx === -1 });
  } catch (error) {
    console.error('LikeNews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createNews = async (req, res) => {
  try {
    const { title, description, content, imageUrl, category, featured } = req.body;

    if (!title || !description || !content) {
      return res.status(400).json({ success: false, message: 'Please provide title, description, and content' });
    }

    const news = await News.create({
      user: req.user.id,
      title,
      description,
      content,
      imageUrl: imageUrl || '',
      category: category || 'other',
      featured: featured || false,
    });

    await news.populate('user', 'username avatar');

    res.status(201).json({ success: true, data: news });
  } catch (error) {
    console.error('CreateNews error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getTrendingNews = async (req, res) => {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trendingQuery }),
    });
    const data = await response.json();
    res.json({ success: true, data: data.data.Page.media });
  } catch (error) {
    console.error('Trending news error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trending news' });
  }
};
