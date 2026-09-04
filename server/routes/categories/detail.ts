import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { updateCategorySchema } from "../../validators/categories.js";
import { updateCategory } from "../../services/categories.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN"]);
  const id = parseIdParam(params.id);

  if (req.method === "PUT") {
    const input = updateCategorySchema.parse(req.body);
    const category = await updateCategory(id, input);
    sendSuccess(res, category);
    return;
  }

  requireMethod(req, "PUT");
});
