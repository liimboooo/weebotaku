const express = require('express');
const router = express.Router();
const {
  createTierList,
  getUserTierLists,
  getUserTierListsByUsername,
  getCommunityTierLists,
  getTierListById,
  updateTierList,
  deleteTierList,
} = require('../controllers/tierlistController');
const { protect, optionalAuth } = require('../middleware/auth');

router.post('/', protect, createTierList);
router.get('/user/:userId', optionalAuth, getUserTierLists);
router.get('/by-username/:username', getUserTierListsByUsername);
router.get('/community', getCommunityTierLists);
router.get('/:id', getTierListById);
router.put('/:id', protect, updateTierList);
router.delete('/:id', protect, deleteTierList);

module.exports = router;
