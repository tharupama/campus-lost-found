const router = require('express').Router();
const { submitFeedback, getMyFeedback, getFeedbackSummary } = require('../controllers/feedback.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', submitFeedback);
router.get('/mine', getMyFeedback);
router.get('/summary', getFeedbackSummary);

module.exports = router;
