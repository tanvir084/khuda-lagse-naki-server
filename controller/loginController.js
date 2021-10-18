// external imports
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const createError = require("http-errors");

// internal imports
const User = require("../models/People");

// do login
async function login(req, res, next) {
  try {
    // find a user who has this email/username
    const user = await User.findOne({
      $or: [{ email: req.body.username }, { mobile: req.body.username }],
    });

    if (user && user._id) {
      const isValidPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );

      if (isValidPassword) {
        // prepare the user object to generate token
        const userObject = {
          username: user.name,
          mobile: user.mobile,
          email: user.email,
          role: "user",
        };

        // generate token
        const token = jwt.sign(userObject, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRY,
        });

        res.status(200).json({
          token: token,
          message: "logged in!",
        });

    //     // set cookie
    //     res.cookie("abcd", token, {
    //       //maxAge: process.env.JWT_EXPIRY,
    //       path: '/*',
    //       domain: ".app.localhost",
    //       //httpOnly: true,
    //       //signed: true,
    //     });
    //     req.AllowAutoRedirect = false;
    //     // res.cookie("rememberme", "1", {
    //     //   expires: new Date(Date.now() + 900000),
    //     //   //httpOnly: true,
    //     //   signed: true,
    //     // });

    //     let cookies =
    //       Object.keys(req.signedCookies).length > 0 ? req.signedCookies : null;
    //     console.log("done", token, cookies);
      } else {
        throw createError("Login failed1! Please try again.");
      }
    } else {
      throw createError("Login failed2! Please try again.");
     }
  } catch (err) {
    res.status(500).json({
      data: {
        username: req.body.username,
      },
      errors: {
        common: {
          msg: err.message,
        },
      },
    });
  }
}

// do logout
function logout(req, res) {
  //res.clearCookie(process.env.COOKIE_NAME);
  res.send("logged out");
}

module.exports = {
  login,
  logout,
};
