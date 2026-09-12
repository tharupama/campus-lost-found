const router = require('express').Router();
const { createClaim, getMyClaims } = require('../controllers/claim.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/mine', protect, getMyClaims);
router.post('/', protect, createClaim);

module.exports = router;