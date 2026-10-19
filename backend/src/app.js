import express from "express";
import cors from "cors";
import morgan from "morgan";

import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { coerceNumbers } from "./middlewares/coerce.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";

const app = express();

app.use(cors({ origin: env.corsOrigin.split(","), allowedHeaders: ["Content-Type", "Authorization"] }));
// Files arrive as base64 data URLs (up to 10 MB of file), so the body limit is larger than the default
app.use(express.json({ limit: "15mb" }));
app.use(coerceNumbers);
if (env.nodeEnv !== "test") app.use(morgan("dev"));

app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
