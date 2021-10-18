// external imports
const { check, validationResult } = require("express-validator");
const createError = require("http-errors");

// internal imports
const Order = require("../../models/Order");

// add user
const addOrderValidators = [
  check("name").isLength({ min: 1 }).withMessage("Name is required"),
  check("email").isEmail().withMessage("Invalid email address"),
  check("transactionId")
    .isLength({ min: 8, max: 8 })
    .withMessage("Invalid transactionId"),
];

const addOrderValidationHandler = function (req, res, next) {
  console.log("add order", req.body);
  const errors = validationResult(req);
  const mappedErrors = errors.mapped();
  if (Object.keys(mappedErrors).length === 0) {
    next();
  } else {
    // response the errors
    console.log("errors");
    res.status(500).json({
      errors: mappedErrors,
    });
  }
};

module.exports = {
  addOrderValidators,
  addOrderValidationHandler,
};