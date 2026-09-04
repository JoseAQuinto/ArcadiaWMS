import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http";
import { requireAuth, requireRole } from "../../auth/middleware";
import { updateOutboundOrderSchema } from "../../validators/outbound";
import { getOutboundOrderById, updateOutboundOrder } from "../../services/outbound.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  const id = parseIdParam(params.id);

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
