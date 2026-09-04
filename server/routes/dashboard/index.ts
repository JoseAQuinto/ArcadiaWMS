import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess } from "../../utils/http";
import { requireAuth } from "../../auth/middleware";
import { getDashboardSummary } from "../../services/dashboard.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");
  const summary = await getDashboardSummary();
  sendSuccess(res, summary);
});
