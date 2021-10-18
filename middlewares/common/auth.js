const jwt = require("jsonwebtoken");

const checkLogin = (req, res, next) => {
  
  let cookies = req.body.token;
    // Object.keys(req.signedCookies).length > 0 ? req.signedCookies : null;
     console.log("auth", cookies);
  if (cookies) {
    try {
      //token = cookies[process.env.COOKIE_NAME];
      const decoded = jwt.verify(cookies, process.env.JWT_SECRET);
      req.user = decoded;
      console.log('vullll');
      console.log(decoded);

      // pass user info to response locals
      // if (res.locals.html) {
      //   res.locals.loggedInUser = decoded;
      // }
      next();
    } catch (err) {
      console.log(err);
        res.status(500).json({
          errors: {
            common: {
              msg: "Authentication failure!",
            },
          },
        });
    }
  } else {
    res.status(401).json({
        error: "Authetication failure!",
      });
  }
};

module.exports = checkLogin;