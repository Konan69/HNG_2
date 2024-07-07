"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUser = void 0;
const validateUser = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errors = error.details.map((err) => ({
                field: err.context.key,
                message: err.message,
            }));
            return res.status(422).json({ errors });
        }
        next();
    };
};
exports.validateUser = validateUser;
