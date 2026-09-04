import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { createCategorySchema } from "../../validators/categories.js";
import { listCategories, createCategory } from "../../services/categories.service.js";

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
