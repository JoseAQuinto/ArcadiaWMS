import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { createReceiptSchema, receiptListQuerySchema } from "../../server/validators/receipts";
import { listReceipts, createReceipt } from "../../server/services/receipts.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);

  if (req.method === "GET") {
    const query = receiptListQuerySchema.parse(flattenQuery(req.query));
    const result = await listReceipts(query);
    sendSuccess(res, result);
    return;
  }

  if (req.method === "POST") {
    requireRole(auth, ["ADMIN", "OPERATOR"]);
    const input = createReceiptSchema.parse(req.body);
    const receipt = await createReceipt(input, auth.sub);
    sendSuccess(res, receipt, 201);
    return;
  }

  requireMethod(req, "GET", "POST");
});
