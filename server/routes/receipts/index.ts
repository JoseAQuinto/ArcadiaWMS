import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { createReceiptSchema, receiptListQuerySchema } from "../../validators/receipts.js";
import { listReceipts, createReceipt } from "../../services/receipts.service.js";

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
