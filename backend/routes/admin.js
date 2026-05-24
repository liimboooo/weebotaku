const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getUsers, updateUserRole, banUser, deleteUser,
  getReports, updateReport, getPosts, deletePost,
  getChatRooms, deleteChatRoom,
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.use(protect, admin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/ban', banUser);
router.delete('/users/:id', deleteUser);
router.get('/reports', getReports);
router.put('/reports/:id', updateReport);
router.get('/posts', getPosts);
router.delete('/posts/:id', deletePost);
router.get('/rooms', getChatRooms);
router.delete('/rooms/:id', deleteChatRoom);

module.exports = router;
