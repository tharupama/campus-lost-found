const router = require('express').Router();
const {
  getClaims,
  reviewClaim,
  getVault,
  handover,
  markAvailable,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllItems,
  updateItem,
  deleteItem,
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(protect, authorize('admin', 'guard'));

router.get('/claims', getClaims);
router.patch('/claims/:id', reviewClaim);
router.get('/vault', getVault);
router.patch('/items/:id/available', markAvailable);
router.post('/handover', handover);

router.get('/users', authorize('admin'), getUsers);
router.post('/users', authorize('admin'), createUser);
router.put('/users/:id', authorize('admin'), updateUser);
router.delete('/users/:id', authorize('admin'), deleteUser);

router.get('/items', authorize('admin'), getAllItems);
router.put('/items/:id', authorize('admin'), upload.single('image'), updateItem);
router.delete('/items/:id', authorize('admin'), deleteItem);

module.exports = router;