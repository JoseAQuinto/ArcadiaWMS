import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { createAdjustmentSchema } from "../../server/validators/adjustments";
import { createAdjustment } from "../../server/services/movements.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const input = createAdjustmentSchema.parse(req.body);
  await createAdjustment(input, auth.sub);
  sendSuccess(res, { message: "Regularización registrada correctamente." }, 201);
});
