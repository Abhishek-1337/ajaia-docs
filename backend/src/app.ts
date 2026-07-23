import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { documentsRoutes } from "./routes/documents";
import { sharesRoutes } from "./routes/shares";
import { uploadRoutes } from "./routes/upload";
import { getUserByEmail, listUsers } from "./auth";

export function createApp() {
  return new Elysia()
    .use(cors({
      origin: Bun.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    }))
    .get("/api/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
    .post("/api/login", async ({ body, status }) => {
      const { email } = body as { email: string };
      if (!email) return status(400, { error: "Email is required" });

      const user = await getUserByEmail(email);
      if (!user) return status(404, { error: "User not found" });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_color: user.avatarColor,
      };
    })
    .get("/api/users", async ({ headers, status }) => {
      const userId = headers["x-user-id"];
      if (!userId) return status(401, { error: "Unauthorized" });
      const users = await listUsers();
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar_color: u.avatarColor,
      }));
    })
    .use(documentsRoutes)
    .use(sharesRoutes)
    .use(uploadRoutes)
    .onError(({ code, error: err }) => {
      if (code === "VALIDATION") {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    });
}
