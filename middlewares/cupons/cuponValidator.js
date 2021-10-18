// external imports
const { check, validationResult } = require("express-validator");
const createError = require("http-errors");

// internal imports
const Cupon = require("../../models/Cupon");

// add user
const addCuponValidators = [
  check("name")
    .isLength({ min: 1 })
    .withMessage("Name is required")
    //.isAlpha("en-US", { ignore: " -0123456789" })
    //.withMessage("Name must not contain anything other than alphabet and number")
    .trim()
    .custom(async (value) => {
      try {
        const name = await Cupon.findOne({ name: value });
        console.log(name);
        if (name) {
          console.log("if");
          throw createError("Cupon name is already use!");
        }
      } catch (err) {
        console.log("catec");
        throw createError(err.message);
      }
    }),
  check("code")
    .isLength({ min: 1 })
    .withMessage("code is required")
    .isNumeric()
    .withMessage("code must be number")
    .trim()
    .custom(async (value) => {
      try {
        const code = await Cupon.findOne({ code: value });
        if (code) {
          throw createError("Cupon code is already use!");
        }
      } catch (err) {
        console.log('cated');
        throw createError(err.message);
      }
    }),
  check("value")
    .isNumeric()
    .withMessage("Invalid number")
    .isLength({ min: 1 })
    .withMessage("Value is required"),
  check("minCost")
    .isNumeric()
    .withMessage("Invalid number")
    .isLength({ min: 1 })
    .withMessage("Value is required"),
];

const addCuponValidationHandler = function (req, res, next) {
  //console.log("add user", req.body);
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
  addCuponValidators,
  addCuponValidationHandler,
};
