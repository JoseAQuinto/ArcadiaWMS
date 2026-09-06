import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { createUserSchema, userListQuerySchema } from "../../validators/users.js";
import { createUser, listUsers } from "../../services/users.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  // Accounts are an admin-only concern: an operator has no reason to see who
  // else exists, and even less to create logins.
  requireRole(auth, ["ADMIN"]);

  if (req.method === "GET") {
    const query = userListQuerySchema.parse(flattenQuery(req.query));
    sendSuccess(res, await listUsers(query));
    return;
  }

  if (req.method === "POST") {
    const input = createUserSchema.parse(req.body);
    sendSuccess(res, await createUser(input), 201);
    return;
  }

  requireMethod(req, "GET", "POST");
});
