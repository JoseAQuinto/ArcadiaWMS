import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../server/utils/http";
import { requireAuth } from "../../server/auth/middleware";
import { stockListQuerySchema } from "../../server/validators/stock";
import { listStock } from "../../server/services/stock.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const query = stockListQuerySchema.parse(flattenQuery(req.query));
  const result = await listStock(query);
  sendSuccess(res, result);
});
