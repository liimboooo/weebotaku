const express = require('express');
const router = express.Router();
const {
  createTierList,
  getUserTierLists,
  getCommunityTierLists,
  getTierListById,
  updateTierList,
  deleteTierList,
} = require('../controllers/tierlistController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createTierList);
router.get('/user/:userId', getUserTierLists);
router.get('/community', getCommunityTierLists);
router.get('/:id', getTierListById);
router.put('/:id', protect, updateTierList);
router.delete('/:id', protect, deleteTierList);

module.exports = router;
