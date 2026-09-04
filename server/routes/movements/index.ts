import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../utils/http";
import { requireAuth } from "../../auth/middleware";
import { movementListQuerySchema } from "../../validators/movements";
import { listMovements } from "../../services/movements.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const query = movementListQuerySchema.parse(flattenQuery(req.query));
  const result = await listMovements(query);
  sendSuccess(res, result);
});
