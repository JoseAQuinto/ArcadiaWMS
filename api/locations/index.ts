import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, sendSuccess, flattenQuery } from "../../server/utils/http";
import { requireAuth, requireRole } from "../../server/auth/middleware";
import { createLocationSchema, locationListQuerySchema } from "../../server/validators/locations";
import { listLocations, createLocation } from "../../server/services/locations.service";

export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const auth = requireAuth(req);

  if (req.method === "GET") {
    const query = locationListQuerySchema.parse(flattenQuery(req.query));
    const result = await listLocations(query);
    sendSuccess(res, result);
    return;
  }

  if (req.method === "POST") {
    requireRole(auth, ["ADMIN"]);
    const input = createLocationSchema.parse(req.body);
    const location = await createLocation(input);
    sendSuccess(res, location, 201);
    return;
  }

  requireMethod(req, "GET", "POST");
});
