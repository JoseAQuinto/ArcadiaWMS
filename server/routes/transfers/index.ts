import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http";
import { requireAuth, requireRole } from "../../auth/middleware";
import { createTransferSchema } from "../../validators/transfers";
import { createTransfer } from "../../services/movements.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  requireRole(auth, ["ADMIN", "OPERATOR"]);
  requireMethod(req, "POST");

  const input = createTransferSchema.parse(req.body);
  await createTransfer(input, auth.sub);
  sendSuccess(res, { message: "Transferencia realizada correctamente." }, 201);
});
