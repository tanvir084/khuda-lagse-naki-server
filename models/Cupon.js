const mongoose = require("mongoose");

const cuponSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: Number,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    minCost: {
      type: Number,
      required: true,
    },
    maxUse: {
      type: Number,
      default: 2,
    },
    quantity: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

const Cupon = mongoose.model("Cupon", cuponSchema);

module.exports = Cupon;
