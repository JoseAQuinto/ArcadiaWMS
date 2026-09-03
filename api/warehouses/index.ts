import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../server/utils/http";
import { requireAuth } from "../../server/auth/middleware";
import { listWarehouses } from "../../server/services/warehouses.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const warehouses = await listWarehouses();
  sendSuccess(res, warehouses);
});
