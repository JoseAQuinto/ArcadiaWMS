import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../server/utils/http";
import { loginSchema } from "../../server/validators/auth";
import { login } from "../../server/services/auth.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const input = loginSchema.parse(req.body);
  const result = await login(input.identifier, input.password);
  sendSuccess(res, result);
});
