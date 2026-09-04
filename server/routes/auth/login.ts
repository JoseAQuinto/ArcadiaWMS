import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http.js";
import { loginSchema } from "../../validators/auth.js";
import { login } from "../../services/auth.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, "POST");
  const input = loginSchema.parse(req.body);
  const result = await login(input.identifier, input.password);
  sendSuccess(res, result);
});
