const mongoose = require("mongoose");

const foodSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    resturant: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
      type: String,
      trim: true,
      required: true,
    },
    quantity: {
      type: Number,
      default: 3,
    },
    details: {
      type: String,
      default: "This is our newly added food",
    },
    imgSource: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

const Food = mongoose.model("Food", foodSchema);

module.exports = Food;
