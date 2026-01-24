const Joi = require('joi');

const addSkillSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    type: Joi.string().valid('TEACH', 'LEARN').required()
});

module.exports = {
    addSkillSchema
};
