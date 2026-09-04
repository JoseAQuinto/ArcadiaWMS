import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http.js";
import { requireAuth } from "../../auth/middleware.js";
import { listWarehouses } from "../../services/warehouses.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const warehouses = await listWarehouses();
  sendSuccess(res, warehouses);
});
