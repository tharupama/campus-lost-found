const router = require('express').Router();
const { getSecurityTeam } = require('../controllers/staff.controller');

router.get('/team', getSecurityTeam);

module.exports = router;
