const router = require('express').Router();
const {
  getClaims,
  reviewClaim,
  getVault,
  handover,
  markAvailable,
  getUsers,
  updateUser,
  deleteUser,
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin', 'guard'));

router.get('/claims', getClaims);
router.patch('/claims/:id', reviewClaim);
router.get('/vault', getVault);
router.patch('/items/:id/available', markAvailable);
router.post('/handover', handover);

router.get('/users', authorize('admin'), getUsers);
router.put('/users/:id', authorize('admin'), updateUser);
router.delete('/users/:id', authorize('admin'), deleteUser);

module.exports = router;