import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../utils/http.js";
import { requireAuth } from "../../auth/middleware.js";
import { movementListQuerySchema } from "../../validators/movements.js";
import { listMovements } from "../../services/movements.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const query = movementListQuerySchema.parse(flattenQuery(req.query));
  const result = await listMovements(query);
  sendSuccess(res, result);
});
