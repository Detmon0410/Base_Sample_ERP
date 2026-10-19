// Creates / updates the schema of the test database (kanou_mini_erp_test). Run before the tests.
import "./env.js";
import { execSync } from "node:child_process";

console.log("Preparing the test database ...");
execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "inherit", env: process.env });
