import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { updateReceiptSchema } from "../../server/validators/receipts";
import { getReceiptById, updateReceipt } from "../../server/services/receipts.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  const id = parseIdParam(req.query.id);

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
