import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../../server/utils/http";
import { requireAuth, requireRole } from "../../../server/auth/middleware";
import { receiveLineSchema } from "../../../server/validators/receipts";
import { receiveLine } from "../../../server/services/receipts.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const receiptId = parseIdParam(req.query.id);
  const input = receiveLineSchema.parse(req.body);
  const receipt = await receiveLine(receiptId, input, auth.sub);
  sendSuccess(res, receipt);
});
