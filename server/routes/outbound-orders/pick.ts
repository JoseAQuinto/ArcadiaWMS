import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http";
import { requireAuth, requireRole } from "../../auth/middleware";
import { pickLineSchema } from "../../validators/outbound";
import { pickLine } from "../../services/outbound.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const orderId = parseIdParam(params.id);
  const input = pickLineSchema.parse(req.body);
  const order = await pickLine(orderId, input, auth.sub);
  sendSuccess(res, order);
});
