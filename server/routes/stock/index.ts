import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../utils/http.js";
import { requireAuth } from "../../auth/middleware.js";
import { stockListQuerySchema } from "../../validators/stock.js";
import { listStock } from "../../services/stock.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const query = stockListQuerySchema.parse(flattenQuery(req.query));
  const result = await listStock(query);
  sendSuccess(res, result);
});
