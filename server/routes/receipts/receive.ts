import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { receiveLineSchema } from "../../validators/receipts.js";
import { receiveLine } from "../../services/receipts.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const receiptId = parseIdParam(params.id);
  const input = receiveLineSchema.parse(req.body);
  const receipt = await receiveLine(receiptId, input, auth.sub);
  sendSuccess(res, receipt);
});
