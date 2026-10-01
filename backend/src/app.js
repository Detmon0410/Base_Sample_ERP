import express from "express";
import cors from "cors";
import morgan from "morgan";

import routes from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
