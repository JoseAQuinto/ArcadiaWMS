import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http.js";
import { requireAuth } from "../../auth/middleware.js";
import { getStockByItem } from "../../services/stock.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const itemId = parseIdParam(params.id);
  const rows = await getStockByItem(itemId);
  sendSuccess(res, rows);
});
