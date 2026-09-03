import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { updateOutboundOrderSchema } from "../../server/validators/outbound";
import { getOutboundOrderById, updateOutboundOrder } from "../../server/services/outbound.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  const id = parseIdParam(req.query.id);

  if (req.method === "GET") {
    const order = await getOutboundOrderById(id);
    sendSuccess(res, order);
    return;
  }

  if (req.method === "PUT") {
    requireRole(auth, ["ADMIN", "OPERATOR"]);
    const input = updateOutboundOrderSchema.parse(req.body);
    const order = await updateOutboundOrder(id, input);
    sendSuccess(res, order);
    return;
  }

  requireMethod(req, "GET", "PUT");
});
