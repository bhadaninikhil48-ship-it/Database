const {body} = require("express-validator")

const userValidation = [
    body("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required"),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Enter a valid email"),

    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
];

module.exports = {userValidation}