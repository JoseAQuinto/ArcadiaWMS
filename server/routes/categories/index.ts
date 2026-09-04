import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../utils/http";
import { requireAuth, requireRole } from "../../auth/middleware";
import { createCategorySchema } from "../../validators/categories";
import { listCategories, createCategory } from "../../services/categories.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);

  if (req.method === "GET") {
    const { includeInactive } = flattenQuery(req.query);
    const categories = await listCategories(includeInactive === "true" && auth.role === "ADMIN");
    sendSuccess(res, categories);
    return;
  }

  if (req.method === "POST") {
    requireRole(auth, ["ADMIN"]);
    const input = createCategorySchema.parse(req.body);
    const category = await createCategory(input);
    sendSuccess(res, category, 201);
    return;
  }

  requireMethod(req, "GET", "POST");
});
