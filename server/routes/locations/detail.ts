import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam, type RouteParams } from "../../utils/http.js";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { updateLocationSchema } from "../../validators/locations.js";
import { getLocationById, updateLocation } from "../../services/locations.service.js";

export default withHandler(async (req: VercelRequest, res: VercelResponse, params: RouteParams) => {
  const auth = requireAuth(req);
  const id = parseIdParam(params.id);

  if (req.method === "GET") {
    const location = await getLocationById(id);
    sendSuccess(res, location);
    return;
  }

  if (req.method === "PUT") {
    requireRole(auth, ["ADMIN"]);
    const input = updateLocationSchema.parse(req.body);
    const location = await updateLocation(id, input);
    sendSuccess(res, location);
    return;
  }

  requireMethod(req, "GET", "PUT");
});
