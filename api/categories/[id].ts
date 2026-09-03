import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { updateCategorySchema } from "../../server/validators/categories";
import { updateCategory } from "../../server/services/categories.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN"]);
  const id = parseIdParam(req.query.id);

  if (req.method === "PUT") {
    const input = updateCategorySchema.parse(req.body);
    const category = await updateCategory(id, input);
    sendSuccess(res, category);
    return;
  }

  requireMethod(req, "PUT");
});
