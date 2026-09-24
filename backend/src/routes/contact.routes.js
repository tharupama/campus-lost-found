const router = require('express').Router();
const { sendContactMessage, getContactStaff } = require('../controllers/contact.controller');

router.get('/staff', getContactStaff);
router.post('/', sendContactMessage);

module.exports = router;