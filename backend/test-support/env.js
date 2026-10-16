// Must be the first import of every test file: points the app at a separate test database.
import "dotenv/config";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = new URL(process.env.DATABASE_URL);
const name = url.pathname.replace(/^\//, "");
if (!name.endsWith("_test")) url.pathname = `/${name}_test`;

// Safety: the tests wipe every table, so they only ever run on a database whose name ends with _test
if (!url.pathname.endsWith("_test")) throw new Error("Refusing to run tests on a database that is not a _test database");

process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.UPLOAD_DIR = join(tmpdir(), "kanou-test-uploads");
