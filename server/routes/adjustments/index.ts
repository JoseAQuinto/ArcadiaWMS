import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { createAdjustmentSchema } from "../../validators/adjustments.js";
import { createAdjustment } from "../../services/movements.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const input = createAdjustmentSchema.parse(req.body);
  await createAdjustment(input, auth.sub);
  sendSuccess(res, { message: "Regularización registrada correctamente." }, 201);
});
