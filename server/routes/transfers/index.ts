import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { createTransferSchema } from "../../validators/transfers.js";
import { createTransfer } from "../../services/movements.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const input = createTransferSchema.parse(req.body);
  await createTransfer(input, auth.sub);
  sendSuccess(res, { message: "Transferencia realizada correctamente." }, 201);
});
