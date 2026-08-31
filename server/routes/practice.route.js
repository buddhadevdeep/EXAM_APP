const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practice.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All practice routes require authentication
router.use(authenticateToken);

// Get schemas (Teachers and Students both)
router.get('/schemas', practiceController.getPracticeSchemas);

// Create, Update, Delete schemas (Teachers only)
router.post('/schemas', authorizeRoles('Teacher'), practiceController.createPracticeSchema);
router.put('/schemas/:id', authorizeRoles('Teacher'), practiceController.updatePracticeSchema);
router.delete('/schemas/:id', authorizeRoles('Teacher'), practiceController.deletePracticeSchema);

module.exports = router;
