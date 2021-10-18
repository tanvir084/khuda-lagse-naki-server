const mongoose = require("mongoose");

const cuponUserSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    cupon: {
      type: String,
      required: true,
    },
    useNum: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CuponUser = mongoose.model("CuponUser", cuponUserSchema);

module.exports = CuponUser;
