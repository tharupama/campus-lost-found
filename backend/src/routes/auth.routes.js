const router = require('express').Router();
const {
  login,
  startRegistration,
  verifyRegistrationOtp,
  completeRegistration,
  googleAuth,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  verifyTwoFactorLogin,
  disableTwoFactor,
  regenerateRecoveryCodes,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.post('/register/start', startRegistration);
router.post('/register/verify-otp', verifyRegistrationOtp);
router.post('/register/complete', completeRegistration);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('avatar'), updateProfile);

router.post('/2fa/verify', verifyTwoFactorLogin);
router.get('/2fa/status', protect, getTwoFactorStatus);
router.post('/2fa/setup', protect, setupTwoFactor);
router.post('/2fa/enable', protect, enableTwoFactor);
router.post('/2fa/disable', protect, disableTwoFactor);
router.post('/2fa/recovery-codes', protect, regenerateRecoveryCodes);

module.exports = router;

module.exports = router;
