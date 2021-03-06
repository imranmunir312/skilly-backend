const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const validator = require("validator");

const purchaseSchema = new mongoose.Schema({
  score: {
    type: Number,
    default: 0,
  },
  watchedTime: {
    type: Number,
    default: 0,
  },
  currentLecture: {
    type: mongoose.Schema.ObjectId,
    ref: "Lecture",
  },
  courseId: {
    type: mongoose.Schema.ObjectId,
    ref: "Course",
    unique: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    photo: {
      type: String,
      default: "default.jpeg",
    },
    name: {
      type: String,
      minLength: 3,
      maxLength: 40,
      required: [true, "name is required"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      validate: {
        validator: validator.isEmail,
        message: "Email format is incorrect",
      },
      unique: [true, "Email must be Unique"],
    },
    password: {
      type: String,
      required: true,
      select: false,
      validate: {
        validator: function () {
          return validator.matches(
            this.password,
            /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,20}$/
          );
        },
        message:
          "Password must contain special character and uppercase lowercase and numbers",
      },
      min: 8,
    },
    confirmPassword: {
      type: String,
      required: true,
      validate: {
        validator: function () {
          return this.password === this.confirmPassword;
        },
        message: "Confirm password must be same is password",
      },
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["verified", "not-verified", "deactivated"],
      default: "not-verified",
    },
    passwordChangedAt: Date,
    verifyAccountToken: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
    resetTokenExpires: {
      type: Date,
    },
    numOfSubscribedCourses: {
      type: Number,
      default: 0,
    },
    facebookLink: {
      type: String,
    },
    twitterLink: {
      type: String,
    },
    linkedInLink: {
      type: String,
    },
    youtubeLink: {
      type: String,
    },
    designation: {
      type: String,
      default: "Student",
    },
    courses: [purchaseSchema],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.virtual("createdCourses", {
  ref: "Course",
  localField: "_id",
  foreignField: "author",
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = new Date(Date.now());

  next();
});

userSchema.pre("find", function (next) {
  this.find({ status: { $ne: "deactivated" } });
  next();
});

userSchema.pre("findOne", function (next) {
  this.find({ status: { $ne: "deactivated" } });
  next();
});

userSchema.methods.passwordChangedAfter = function (createAt) {
  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt / 1000, 10);
    return createAt < changedAt;
  }
  return false;
};

userSchema.methods.createVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  this.verifyAccountToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  return verificationToken;
};

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.creatingResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

  return resetToken;
};

userSchema.methods.validateResetToken = function () {
  return Date.now() < this.resetTokenExpires;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
