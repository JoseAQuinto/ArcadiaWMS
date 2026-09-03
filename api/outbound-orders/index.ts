import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { createOutboundOrderSchema, outboundListQuerySchema } from "../../server/validators/outbound";
import { listOutboundOrders, createOutboundOrder } from "../../server/services/outbound.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);

  if (req.method === "GET") {
    const query = outboundListQuerySchema.parse(flattenQuery(req.query));
    const result = await listOutboundOrders(query);
    sendSuccess(res, result);
    return;
  }

  if (req.method === "POST") {
    requireRole(auth, ["ADMIN", "OPERATOR"]);
    const input = createOutboundOrderSchema.parse(req.body);
    const order = await createOutboundOrder(input, auth.sub);
    sendSuccess(res, order, 201);
    return;
  }

  requireMethod(req, "GET", "POST");
});
