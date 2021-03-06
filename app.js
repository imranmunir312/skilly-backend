const express = require("express");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const compression = require("compression");
const cloudinary = require("cloudinary").v2;

const courseRouter = require("./router/courseRouter");
const userRouter = require("./router/userRouter");
const statRouter = require("./router/statsRouter");
const categoryRouter = require("./router/categoryRouter");
const globalErrorHandler = require("./controller/errorController");
const filesRouter = require("./router/filesRouter");
const purchaseController = require("./controller/purchasingCourseController");

const codeController = require("./controller/codeExecuteController");

const AppError = require("./util/appError");

const app = express();

cloudinary.config(process.env.CLOUDINARY_URL);

app.use(helmet());

app.use(cors());

app.use(cookieParser());

if (process.env.NODE_ENV === "DEVELOPMENT") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 500,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

app.post(
  "/checkout-completed",
  express.raw({ type: "application/json" }),
  purchaseController.addCourseInUserPurchaseList
);

app.use(express.json({ limit: "50kb" }));

app.use(mongoSanitize());

app.use(xss());

app.use(
  hpp({
    whitelist: ["duration", "price"],
  })
);

app.use(compression());

app.use("/files", filesRouter);
app.use("/api/v1/executeCode", codeController.executingCode);
app.use("/api/v1/information", statRouter);

app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/categories", categoryRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
