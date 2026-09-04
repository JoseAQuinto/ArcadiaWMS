import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { updateReceiptSchema } from "../../validators/receipts.js";
import { getReceiptById, updateReceipt } from "../../services/receipts.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  const id = parseIdParam(params.id);

  if (req.method === "GET") {
    const receipt = await getReceiptById(id);
    sendSuccess(res, receipt);
    return;
  }

  if (req.method === "PUT") {
    requireRole(auth, ["ADMIN", "OPERATOR"]);
    const input = updateReceiptSchema.parse(req.body);
    const receipt = await updateReceipt(id, input);
    sendSuccess(res, receipt);
    return;
  }

  requireMethod(req, "GET", "PUT");
});
