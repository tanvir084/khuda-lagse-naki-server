// external imports
const express = require("express");
const { check } = require("express-validator");

const {
  addUserValidationHandler,
  addUserValidators,
} = require("../middlewares/users/userValidator");
const {addUser} = require("../middlewares/users/userController");
const User = require("../models/People");
const router = express.Router();

//add user
router.post("/", addUserValidators, addUserValidationHandler, addUser);

// router.post("/", async(req, res)=>{
//   console.log(req.body);
//   const newUser = new User(req.body);
//   console.log("post", newUser);
//   await newUser.save((err)=>{
//       if(err){
//           console.log(err.message);
//           res.status(500).json({
//               error: "There was a server side error!",
//           });
//       }
//       else{
//           res.status(200).json({
//               message: "Logged in!",
//           })
//       }
//   });
// });

// remove user
//router.delete("/:id", removeUser);

module.exports = router;
