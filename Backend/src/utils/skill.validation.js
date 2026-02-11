const Joi = require('joi');

const addSkillSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    type: Joi.string().valid('TEACH', 'LEARN').required()
    ,
    isCourse: Joi.boolean().optional(),
    totalSessions: Joi.when('isCourse', { is: true, then: Joi.number().integer().min(1).required(), otherwise: Joi.forbidden() }),
    paymentPlan: Joi.string().valid('per_session', 'per_course', 'hybrid').optional()
});

module.exports = {
    addSkillSchema
};
