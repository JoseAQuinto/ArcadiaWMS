import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../../server/utils/http";
import { requireAuth } from "../../../server/auth/middleware";
import { getStockByLocation } from "../../../server/services/stock.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const locationId = parseIdParam(req.query.id);
  const rows = await getStockByLocation(locationId);
  sendSuccess(res, rows);
});
