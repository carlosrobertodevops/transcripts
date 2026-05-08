import { app } from "@/server";

const handler = (req: Request) => app.handle(req);

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
