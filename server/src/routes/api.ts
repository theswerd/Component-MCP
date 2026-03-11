import { Hono } from "hono";

export const api = new Hono();

api.get("/health", (c) => c.json({ status: "ok" }));

api.get("/hello/:name", (c) => {
  const name = c.req.param("name");
  return c.json({ message: `Hello, ${name}!` });
});
