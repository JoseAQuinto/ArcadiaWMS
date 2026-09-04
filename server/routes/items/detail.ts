import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { updateItemSchema } from "../../validators/items.js";
import { getItemById, updateItem } from "../../services/items.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  const id = parseIdParam(params.id);

  if (req.method === "GET") {
    const item = await getItemById(id);
    sendSuccess(res, item);
    return;
  }

  if (req.method === "PUT") {
    requireRole(auth, ["ADMIN"]);
    const input = updateItemSchema.parse(req.body);
    const item = await updateItem(id, input);
    sendSuccess(res, item);
    return;
  }

  requireMethod(req, "GET", "PUT");
});
