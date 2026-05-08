import { Elysia } from "elysia";
import { authRoutes } from "./auth";
import { transcriptsRoutes } from "./transcripts";
import { mediaRoutes } from "./media";
import { sharesRoutes } from "./shares";
import { notificationsRoutes } from "./notifications";
import { usersRoutes } from "./users";
import { jobsRoutes } from "./jobs";

export const routes = new Elysia({ prefix: "" })
  .use(authRoutes)
  .use(transcriptsRoutes)
  .use(mediaRoutes)
  .use(sharesRoutes)
  .use(notificationsRoutes)
  .use(usersRoutes)
  .use(jobsRoutes);
