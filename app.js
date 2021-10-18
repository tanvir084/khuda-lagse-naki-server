// external imports
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
const cookieParser = require("cookie-parser");
const loginRouter = require("./router/loginRouter");
const usersRouter = require("./router/usersRouter");
const inboxRouter = require("./router/inboxRouter");
const qs = require("querystring");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require("body-parser");
const { CourierClient } = require("@trycourier/courier");
const courier = CourierClient({
  authorizationToken: "pk_prod_YQN9CRWSZS43J0JVYC99A66869B9",
});
const https = require("https");
const qureystring = require("querystring");

//production imports
const helmet = require("helmet");
const compression = require("compression");

// internal imports
const User = require("./models/People");
const Food = require("./models/Food");
const Order = require("./models/Order");
const Cupon = require("./models/Cupon");
const CuponUser = require("./models/CuponUser");
const {
  notFoundHandler,
  errorHandler,
} = require("./middlewares/common/errorHandler");
const {
  addUserValidationHandler,
  addUserValidators,
} = require("./middlewares/users/userValidator");
const {
  addCuponValidators,
  addCuponValidationHandler,
} = require("./middlewares/cupons/cuponValidator");
const { login, logout } = require("./controller/loginController");
const {
  doLoginValidators,
  doLoginValidationHandler,
} = require("./middlewares/login/loginValidators");

const {
  addOrderValidators,
  addOrderValidationHandler,
} = require("./middlewares/orders/orderValidator");
const auth = require("./middlewares/common/auth");
const { toUnicode } = require("punycode");
const { parse } = require("path");

const app = express();
dotenv.config();

// database connection
mongoose
  .connect(process.env.MONGO_CONNECTION_STRING, {
    //userNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("database connection successful!"))
  .catch((err) => console.log(err));

// request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// parse cookies
//app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(
  cors({
    origin: "*",
  })
);

// prodcution setup
app.use(helmet());
app.use(compression());

// routing setup
//app.use("/", loginRouter);
//app.use("/users", usersRouter);
//app.use("/inbox", inboxRouter);
//app.use(bodyParser.urlencoded({ extended: true }));

const twilio = {
  fromPhone: "+15046083420",
  accountSid: "ACab5df9a558efed7d4182fd16e43e0f96",
  authToken: "8a9f91f6dfc275941cf0e7d60ea3aeb4",
};

const sendTwilioSms = (phone, msg, callback) => {
  const userPhone =
    typeof phone === "string" && phone.trim().length === 11 ? phone : false;

  const userMsg =
    typeof msg === "string" && msg.trim().length > 0 && msg.trim().length < 1600
      ? msg
      : false;

  console.log("msg", userMsg, "phone", userPhone, phone);

  if (userPhone && userMsg) {
    // configuration the request payload
    const payload = {
      From: twilio.fromPhone,
      To: `+88${userPhone}`,
      Body: userMsg,
    };

    //stringify the payload
    const stringifyPayload = qureystring.stringify(payload);

    //configure the request details
    const requestDetails = {
      hostname: "api.twilio.com",
      method: "POST",
      path: `/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
      auth: `${twilio.accountSid}:${twilio.authToken}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };

    // instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // get the status of the sent request
      const status = res.statusCode;
      //console.log(res);

      // callback successfully if the request went through
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback(`Status code returned was ${status}`);
      }
    });

    req.on("error", (e) => {
      callback(e);
    });

    req.write(stringifyPayload);
    req.end();
  } else {
    callback("Given parameteres were missing or invalid!");
  }
};

app.post(
  "/signup",
  addUserValidators,
  addUserValidationHandler,
  async (req, res) => {
    console.log(req.body);
    let newUser;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    newUser = new User({
      ...req.body,
      password: hashedPassword,
    });

    console.log(newUser);

    // save user or send error
    try {
      const result = await newUser.save();
      res.status(200).json({
        user: newUser,
        message: "User was added successfully!",
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        errors: {
          common: {
            msg: "Unknown error occured!",
          },
        },
      });
    }
  }
);

// process login
app.use(cookieParser());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
app.post("/login", doLoginValidators, doLoginValidationHandler, login);

//change password
app.put("/change_password", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    console.log(hashedPassword);
    console.log(req.body);
    const result = await User.updateOne(
      { name: req.body.name, email: req.body.email },
      {
        $set: {
          password: hashedPassword,
        },
      }
    );
    res.status(200).json({
      msg: "Password was changed successfully!!",
    });
    console.log(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// process logout
app.delete("/logout", logout);

// admin panel
app.get("/allfoods", async (req, res) => {
  const foods = await Food.find();
  console.log(foods);
  res.send(foods);
});

app.get("/allusers", async (req, res) => {
  const users = await User.find();
  console.log(users);
  res.send(users);
});

app.get("/allorders", async (req, res) => {
  const orders = await Order.find({ condition: "success" })
    .limit(15)
    .sort({ createdAt: -1 });
  console.log(orders);
  res.send(orders);
});

app.get("/allpendings", async (req, res) => {
  const orders = await Order.find({ condition: "pending" }).limit(10);
  console.log(orders);
  res.send(orders);
});

app.post("/foods", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  const newFood = new Food(req.body);
  console.log("post", newFood);
  await newFood.save((err) => {
    if (err) {
      console.log(err.message);
      res.status(500).json({
        error: "There was a server side error!",
      });
    } else {
      res.status(200).json({
        newFood,
      });
    }
  });
});

app.post("/search_name", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  if (req.body.name == "") {
    res.status(404).json({
      message: "There is no item of your desired search",
    });
  } else {
    let val = ".*" + req.body.name + ".*";
    val = new RegExp(val, "i");
    console.log(val);

    const foodName = await Food.find({ name: val })
      .limit(10)
      .sort({ name: 1 })
      .select({
        _id: 0,
        name: 1,
        price: 1,
        resturant: 1,
        location: 1,
        imgSource: 1,
      });

    console.log(foodName);
    if (foodName && foodName.length > 0) {
      res.status(200).json({
        item: foodName,
        message: "search successful",
      });
    } else {
      res.status(404).json({
        message: "There is no item of your desired search",
      });
    }
  }
});

app.post("/search_resturant", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  if (req.body.name == "") {
    res.status(404).json({
      message: "There is no item of your desired search",
    });
  } else {
    let val = ".*" + req.body.name + ".*";
    val = new RegExp(val, "i");

    const foodResturant = await Food.find({ resturant: val })
      .limit(10)
      .sort({ name: 1 })
      .select({ name: 1, price: 1, resturant: 1, location: 1, imgSource: 1 });
    if (resturantName && resturant.length > 0) {
      res.status(200).json({
        item: resturantName,
        message: "search successful",
      });
    } else {
      res.status(404).json({
        message: "There is no item of your desired search",
      });
    }
  }
});

app.post("/search_location", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  if (req.body.name == "") {
    res.status(404).json({
      message: "There is no item of your desired search",
    });
  } else {
    let val = ".*" + req.body.name + ".*";
    val = new RegExp(val, "i");

    const foodLocation = await Food.find({ location: val })
      .limit(10)
      .sort({ name: 1 })
      .select({ name: 1, price: 1, resturant: 1, location: 1, imgSource: 1 });
    if (foodLocation && foodLocation.length > 0) {
      res.status(200).json({
        item: foodLocation,
        message: "search successful",
      });
    } else {
      res.status(404).json({
        message: "There is no item of your desired search",
      });
    }
  }
});

app.post("/search_price", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);
  if (req.body.down == "" || req.body.up == "") {
    res.status(404).json({
      message: "There is no item of your desired search",
    });
  } else {
    const foodPrice = await Food.find({
      price: { $gte: req.body.down, $lte: req.body.up },
    })
      .limit(10)
      .sort({ name: 1 })
      .select({ name: 1, price: 1, resturant: 1, location: 1, imgSource: 1 });
    if (foodPrice && foodPrice.length > 0) {
      res.status(200).json({
        item: foodPrice,
        message: "search successful",
      });
    } else {
      res.status(404).json({
        message: "There is no item of your desired search",
      });
    }
  }
});

app.post("/user_data", auth, async (req, res) => {
  res.send(req.user);
});

//Order
app.post(
  "/orders",
  addOrderValidators,
  addUserValidationHandler,
  async (req, res) => {
    console.log("res");
    console.log(req.body);
    let order = req.body;
    let arr = [];
    const n = (Object.keys(order).length - 7) / 4;
    if (n == 0) {
      res.status(200).json({
        msg: "Please, order some food before confirming your order.",
      });
    } else {
      for (let i = 0; i < n; i++) {
        const obj = {
          name: order["name" + i],
          quantity: order["quantity" + i],
          price: order["price" + i],
          imgSource: order["imgSource" + i],
        };
        arr.push(obj);
      }

      const finalOrder = {
        name: order.name,
        email: order.email,
        mobile: order.mobile,
        condition: order.condition,
        totalPrice: order.totalPrice,
        transactionId: order.transactionId,
        details: arr,
        address: order.address,
      };

      console.log(finalOrder);

      const newOrder = new Order(finalOrder);
      console.log("post", newOrder);
      await newOrder.save((err) => {
        if (err) {
          console.log(err.message);
          res.status(500).json({
            error: "There was a server side error!",
          });
        } else {
          const msg = `Dear ${finalOrder.name}, your order is confirmed.
          Thank you
          Khuda Lagse Naki! Team.`;
          const userPhone = finalOrder.mobile;

          sendTwilioSms(userPhone, msg, (err) => {
            if (!err) {
              console.log(
                `User was alerted to a status change via SMS: ${msg}`
              );
            } else {
              console.log(
                "There was a problem sending sms to one of the user!",
                err
              );
            }
          });

          courier
            .send({
              eventId: "personalized-welcome-email",
              recipientId: "61bbebe6-4a9d-47f5-b00b-2d51cf4721cd",
              profile: {
                email: finalOrder.email,
              },
              data: {},
              override: {}, // optional variables for merging into templates
            })
            .then((resp) => {
              console.log("Email sent", resp);
            })
            .catch((error) => {
              console.error(error);
            });
          res.status(200).json({
            msg: "payment confirmed and check your mail and phone inbox(If your number is twillo verified).",
            order: newOrder,
          });
        }
      });
    }
  }
);

app.post("/user_data", auth, async (req, res) => {
  res.send(req.user);
});

//Email Verification //mobile verification
app.post("/email_verification", async (req, res) => {
  console.log("res");
  console.log(req.body);

  const val = Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;

  courier
    .send({
      eventId: "courier-quickstart",
      recipientId: "a869e408-a84a-4739-a4a7-292b611a9da1",
      profile: {
        email: req.body.email,
      },
      data: {},
      override: {}, // optional variables for merging into templates
    })
    .then((resp) => {
      console.log("Email sent", resp);
    })
    .catch((error) => {
      console.error(error);
    });

  const msg = `Dear ${req.body.name}, your signup OTP is ${val}.
        Thank you
        Khuda Lagse Naki! Team.`;
  const userPhone = req.body.mobile;

  sendTwilioSms(userPhone, msg, (err) => {
    if (!err) {
      console.log(`User was alerted to a status change via SMS: ${msg}`);
    } else {
      console.log("There was a problem sending sms to one of the user!", err);
    }
  });
  res.status(200).json({
    msg: "Your verification email is send and check your mobile inbox(if your mobile number is twilio verified).",
    cc: val,
  });
});

//user profile
app.post("/user_profile", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  const user = await Order.find({
    name: req.body.name,
    email: req.body.email,
    condition: "success",
  })
    .limit(5)
    .sort({ createdAt: -1 })
    .select({ createdAt: 1, details: 1, address: 1, totalPrice: 1 });

  console.log(user);
  if (user) {
    res.status(200).json({
      details: user,
      message: "search successful",
    });
  } else {
    res.status(404).json({
      message: "There is no item of your desired search",
    });
  }
});

app.post("/user_pending", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  const user = await Order.find({
    name: req.body.name,
    email: req.body.email,
    condition: "pending",
  })
    .limit(5)
    .select({ createdAt: 1, details: 1, address: 1, totalPrice: 1 });

  console.log(user);
  if (user) {
    res.status(200).json({
      details: user,
      message: "search successful",
    });
  } else {
    res.status(404).json({
      message: "There is no item of your desired search",
    });
  }
});

//pending status change
app.put("/pending", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  console.log(typeof req.body.id);
  console.log(req.body.id);

  try {
    const result = await Order.updateOne(
      { _id: req.body.id },
      {
        $set: {
          condition: "success",
        },
      }
    );
    res.status(200).json({
      msg: "Order is successfull",
    });
    console.log(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

//order quantity updated
app.put("/quantity_update", async (req, res) => {
  console.log("quantity");
  console.log(typeof req.body);
  console.log(req.body);

  const order = req.body;

  try {
    let arr = [];
    const n = Object.keys(order).length / 3;
    for (let i = 0; i < n; i++) {
      const obj = {
        id: order["id" + i],
        quantity: order["quantity" + i],
        preQuantity: order["preQuantity" + i],
      };
      arr.push(obj);
    }
    let result = [];
    for (let i = 0; i < n; i++) {
      //console.log(typeof(arr[i].id));
      //console.log(arr[i].id);
      //let val = parseInt(arr[i].preQuantity - arr[i].quantity);
      //console.log(val);
      result[i] = await Food.updateOne(
        { _id: arr[i].id },
        {
          $set: {
            quantity: Math.max(
              0,
              parseInt(arr[i].preQuantity - arr[i].quantity)
            ),
          },
        }
      );
      console.log(result[i]);
    }
    res.status(200).json({
      msg: "Foods quantity updated successfully.",
    });
    // try {
    //   const result = await Food.updateOne(
    //     { _id: req.body.id },
    //     {
    //       $set: {
    //         quantity: parseInt(req.body.preQuantity - req.body.quantity),
    //       },
    //     }
    //   );
    //   res.status(200).json({
    //     msg: "Order is successfull",
    //   });
    //   console.log(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// food update admin panel
app.put("/admin/food/update", async (req, res) => {
  console.log(req.body);

  try {
    const result = await Food.updateOne(
      { _id: req.body.id },
      {
        $set: {
          quantity: Math.max(0, parseInt(req.body.quantity)),
          price: Math.max(0, parseInt(req.body.price)),
        },
      }
    );
    console.log(result);
    res.status(200).json({
      msg: "Food price and quantity updated successfully.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// delete order
app.delete("/delete", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  try {
    const result = await Order.deleteOne({ _id: req.body.id });
    res.status(200).json({
      msg: "Order was deleted",
    });
    console.log(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// delete order
app.delete("/delete_user", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  try {
    const result = await User.deleteOne({ _id: req.body.id });
    res.status(200).json({
      msg: "User was deleted",
    });
    console.log(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// otp config

app.get("/otp_user", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);
  const user = await User.find().limit(1).sort({ createdAt: -1 });
  console.log(user);

  res.status(200).json({ user });
});

app.delete("/otp_delete", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  try {
    const result = await User.deleteOne({ _id: req.body.id });
    res.status(200).json({
      msg: "User is deleted",
    });
    console.log(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// cupon
// making cupon

app.post(
  "/cupons",
  addCuponValidators,
  addCuponValidationHandler,
  async (req, res) => {
    console.log(typeof req.body);
    console.log(req.body);

    req.body.code = parseInt(req.body.code);
    req.body.value = parseInt(req.body.value);
    req.body.minCost = parseInt(req.body.minCost);
    req.body.maxUse = parseInt(req.body.maxUse);
    req.body.quantity = parseInt(req.body.quantity);

    const newCupon = new Cupon(req.body);
    console.log("post", newCupon);
    await newCupon.save((err) => {
      if (err) {
        console.log(err.message);
        res.status(500).json({
          error: "There was a server side error!",
        });
      } else {
        res.status(200).json({
          msg: "Cupon was added successfully",
          newCupon,
        });
      }
    });
  }
);

// all cupon frontend
app.get("/user/allcupons", async (req, res) => {
  const orders = await Cupon.find({ quantity: { $gt: 1 } })
    .limit(10)
    .sort({ value: -1 });
  console.log(orders);
  res.send(orders);
});

// all cupon admin
app.get("/admin/allcupons", async (req, res) => {
  const orders = await Cupon.find().limit(10).sort({ value: -1 });
  console.log(orders);
  res.send(orders);
});

// cupon validation
app.post("/cupon_validation", async (req, res) => {
  //req.body(name, email, cupon)
  let result = await Cupon.find({ name: req.body.cupon });

  if (isNaN(parseInt(req.body.cupon)) == false) {
    result = await Cupon.find({ code: req.body.cupon });
  }

  console.log("cupon", result);
  console.log("body", req.body);

  if (result && result.length > 0) {
    if (result[0].quantity == 0) {
      res.status(400).json({
        msg: "Cupon was expired",
      });
    } else if (result[0].minCost > parseInt(req.body.cost)) {
      res.status(400).json({
        msg: `Please, order ${result[0].minCost} tk, for using this cupon`,
      });
    } else {
      let val = await CuponUser.find({
        name: req.body.name,
        email: req.body.email,
        cupon: result[0].name,
      });
      console.log("cuponUser", val);

      if (val && val.length > 0) {
        if (val[0].useNum >= result[0].maxUse) {
          res.status(400).json({
            msg: "Cupon limit was finished",
          });
        } else {
          res.status(200).json({
            msg: "valid cupon",
            cupon: result[0].name,
            value: result[0].value,
          });
        }
      } else {
        res.status(200).json({
          msg: "valid cupon",
          cupon: result[0].name,
          value: result[0].value,
        });
      }
    }
  } else {
    res.status(400).json({
      msg: "Invalid Cupon",
    });
  }
});

//cupon update
app.put("/update_cupon", async (req, res) => {
  try {
    const result = await Cupon.updateOne(
      { name: req.body.cupon },
      {
        $inc: {
          quantity: -1,
        },
      }
    );
    res.status(200).json({
      msg: "cupon update is successfull",
    });
    //   console.log(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

//user cupon update
app.put("/update_cupon_user", async (req, res) => {
  try {
    const result = await CuponUser.find({
      name: req.body.name,
      email: req.body.email,
      cupon: req.body.cupon,
    });
    if (result && result.length > 0) {
      const result = await CuponUser.updateOne(
        { name: req.body.name, email: req.body.email, cupon: req.body.cupon },
        {
          $inc: {
            useNum: 1,
          },
        }
      );
      res.status(200).json({
        msg: "user cupon update is successfull",
      });
      console.log(result);
    } else {
      req.body.useNum = 1;
      const newCuponUser = new CuponUser(req.body);
      console.log("put", newCuponUser);
      await newCuponUser.save((err) => {
        if (err) {
          console.log(err.message);
          res.status(500).json({
            error: "There was a server side error!",
          });
        } else {
          res.status(200).json({
            msg: "Cupon was added successfully",
            newCuponUser,
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// cupon update admin panel
app.put("/admin/cupon/update", async (req, res) => {
  console.log(req.body);

  try {
    const result = await Cupon.updateOne(
      { _id: req.body.id },
      {
        $set: {
          maxUse: Math.max(0, parseInt(req.body.maxUse)),
          quantity: Math.max(0, parseInt(req.body.quantity)),
        },
      }
    );
    console.log(result);
    res.status(200).json({
      msg: "Cupon maxUse and quantity updated successfully.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// delete cupon
app.delete("/delete_cupon", async (req, res) => {
  console.log(typeof req.body);
  console.log(req.body);

  try {
    const result = await Cupon.deleteOne({ _id: req.body.id });
    res.status(200).json({
      msg: "Cupon was deleted successfully!",
    });
    console.log(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      msg: "There was a server side error!",
    });
  }
});

// 404 nout found handler
app.use(notFoundHandler);

// common error handler
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`app listening to port ${process.env.PORT}`);
});
