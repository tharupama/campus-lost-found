const router = require('express').Router();
const upload = require('../middleware/upload.middleware');
const { getItems, getItem, getMyItems, createItem } = require('../controllers/item.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', getItems);
router.get('/mine', protect, getMyItems);
router.get('/:id', getItem);
router.post('/', protect, upload.single('image'), createItem);

module.exports = router;