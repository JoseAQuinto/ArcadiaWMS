import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../utils/http";
import { requireAuth, requireRole } from "../../auth/middleware";
import { itemListQuerySchema, createItemSchema } from "../../validators/items";
import { listItems, createItem } from "../../services/items.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);

  if (req.method === "GET") {
    const query = itemListQuerySchema.parse(flattenQuery(req.query));
    const result = await listItems(query);
    sendSuccess(res, result);
    return;
  }

  if (req.method === "POST") {
    requireRole(auth, ["ADMIN"]);
    const input = createItemSchema.parse(req.body);
    const item = await createItem(input);
    sendSuccess(res, item, 201);
    return;
  }

  requireMethod(req, "GET", "POST");
});
