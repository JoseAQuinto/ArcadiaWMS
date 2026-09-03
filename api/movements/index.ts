import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../server/utils/http";
import { requireAuth } from "../../server/auth/middleware";
import { movementListQuerySchema } from "../../server/validators/movements";
import { listMovements } from "../../server/services/movements.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const query = movementListQuerySchema.parse(flattenQuery(req.query));
  const result = await listMovements(query);
  sendSuccess(res, result);
});
