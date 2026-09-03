import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../server/utils/http";
import { requireAuth } from "../../server/auth/middleware";
import { getUserById } from "../../server/services/auth.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const auth = requireAuth(req);
  const user = await getUserById(auth.sub);
  sendSuccess(res, user);
});
