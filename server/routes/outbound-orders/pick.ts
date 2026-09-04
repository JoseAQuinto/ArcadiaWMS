import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { pickLineSchema } from "../../validators/outbound.js";
import { pickLine } from "../../services/outbound.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const orderId = parseIdParam(params.id);
  const input = pickLineSchema.parse(req.body);
  const order = await pickLine(orderId, input, auth.sub);
  sendSuccess(res, order);
});
