import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http.js";
import { requireAuth } from "../../auth/middleware.js";
import { changePasswordSchema } from "../../validators/users.js";
import { changeOwnPassword } from "../../services/users.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "PUT");
  const auth = requireAuth(req);
  const input = changePasswordSchema.parse(req.body);
  await changeOwnPassword(auth.sub, input.currentPassword, input.newPassword);
  // Any role can change their own password; the JWT stays valid because it
  // carries no password material, so there is nothing to re-issue.
  sendSuccess(res, { message: "Contraseña actualizada correctamente." });
});
