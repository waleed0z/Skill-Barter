const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skill.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { addSkillSchema } = require('../utils/skill.validation');

router.use(authMiddleware); // Protect all skill routes

router.get('/search', skillController.searchSkills);
router.post('/', validate(addSkillSchema), skillController.addSkill);
router.delete('/:name', skillController.removeSkill); // Pass ?type=TEACH or ?type=LEARN
router.get('/user', skillController.getUserSkills);

module.exports = router;
