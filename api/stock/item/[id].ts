import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../../server/utils/http";
import { requireAuth } from "../../../server/auth/middleware";
import { getStockByItem } from "../../../server/services/stock.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const itemId = parseIdParam(req.query.id);
  const rows = await getStockByItem(itemId);
  sendSuccess(res, rows);
});
