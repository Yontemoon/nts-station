import { Hono } from "hono";

const shows = new Hono();

shows.get("/", async (c) => {
  const {} = c.json();
});

export { shows };
