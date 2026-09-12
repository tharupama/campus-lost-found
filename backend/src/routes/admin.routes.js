const router = require('express').Router();
const {
  getClaims,
  reviewClaim,
  getVault,
  handover,
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin', 'guard'));

router.get('/claims', getClaims);
router.patch('/claims/:id', reviewClaim);
router.get('/vault', getVault);
router.post('/handover', handover);

module.exports = router;