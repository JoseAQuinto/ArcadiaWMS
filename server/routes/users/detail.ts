import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { updateUserSchema } from "../../validators/users.js";
import { updateUser } from "../../services/users.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN"]);
  requireMethod(req, "PUT");

  const id = parseIdParam(params.id);
  const input = updateUserSchema.parse(req.body);
  // The acting user is passed down so the service can refuse the two changes
  // that would lock an admin out of their own system.
  sendSuccess(res, await updateUser(id, input, auth.sub));
});
