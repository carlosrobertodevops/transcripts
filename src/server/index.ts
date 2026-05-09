import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { transcriptsRoutes } from "./routes/transcripts";
import { mediaRoutes } from "./routes/media";
import { sharesRoutes } from "./routes/shares";
import { notificationsRoutes } from "./routes/notifications";
import { usersRoutes } from "./routes/users";
import { jobsRoutes } from "./routes/jobs";
import { tagsRoutes } from "./routes/tags";
import { errorPlugin } from "./plugins/error";
import { authPlugin } from "./plugins/auth";

const app = new Elysia({
  prefix: "/api",
})
  .use(cors())
  .use(errorPlugin)
  .use(authPlugin)
  .use(authRoutes)
  .use(transcriptsRoutes)
  .use(mediaRoutes)
  .use(sharesRoutes)
  .use(notificationsRoutes)
  .use(usersRoutes)
  .use(jobsRoutes)
  .use(tagsRoutes);

export { app };

export const handle = (req: Request) => app.handle(req);
