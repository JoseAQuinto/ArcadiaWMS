import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http";
import { loginSchema } from "../../validators/auth";
import { login } from "../../services/auth.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const input = loginSchema.parse(req.body);
  const result = await login(input.identifier, input.password);
  sendSuccess(res, result);
});
