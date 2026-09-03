import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { updateItemSchema } from "../../server/validators/items";
import { getItemById, updateItem } from "../../server/services/items.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  const id = parseIdParam(req.query.id);

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
