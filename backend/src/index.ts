import { Hono } from "hono";
export { DocumentHibernationServer } from "./durable_objects/DocumentHibernationServer";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/api/ws/:docId", (c) => {
  const docId = c.req.param("docId");
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.text("Expected websocket", 400);
  }

  const id = c.env.DOCUMENT_DURABLE_OBJECT.idFromName(docId);
  const stub = c.env.DOCUMENT_DURABLE_OBJECT.get(id);

  return stub.fetch(c.req.raw);
});

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

export default app;
