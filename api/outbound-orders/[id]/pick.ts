import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../../server/utils/http";
import { requireAuth, requireRole } from "../../../server/auth/middleware";
import { pickLineSchema } from "../../../server/validators/outbound";
import { pickLine } from "../../../server/services/outbound.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const orderId = parseIdParam(req.query.id);
  const input = pickLineSchema.parse(req.body);
  const order = await pickLine(orderId, input, auth.sub);
  sendSuccess(res, order);
});
