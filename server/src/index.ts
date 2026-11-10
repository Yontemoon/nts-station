import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { download, shows } from "./routes/index.js";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.route("/download", download);
app.route("/shows", shows);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

export default app;
