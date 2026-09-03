import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, parseIdParam } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { updateLocationSchema } from "../../server/validators/locations";
import { getLocationById, updateLocation } from "../../server/services/locations.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);
  const id = parseIdParam(req.query.id);

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
