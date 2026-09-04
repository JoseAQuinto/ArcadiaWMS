import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http.js";
import { requireAuth } from "../../auth/middleware.js";
import { getUserById } from "../../services/auth.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "GET");
  const auth = requireAuth(req);
  const user = await getUserById(auth.sub);
  sendSuccess(res, user);
});
