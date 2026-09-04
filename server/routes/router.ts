import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, type Handler, type RouteParams } from "../utils/http";
import { ApiError } from "../utils/errors";

import authLogin from "./auth/login";
import authMe from "./auth/me";
import itemsList from "./items/index";
import itemsDetail from "./items/detail";
import categoriesList from "./categories/index";
import categoriesDetail from "./categories/detail";
import warehousesList from "./warehouses/index";
import locationsList from "./locations/index";
import locationsDetail from "./locations/detail";
import stockList from "./stock/index";
import stockByItem from "./stock/by-item";
import receiptsList from "./receipts/index";
import receiptsDetail from "./receipts/detail";
import receiptsReceive from "./receipts/receive";
import outboundList from "./outbound-orders/index";
import outboundDetail from "./outbound-orders/detail";
import outboundPick from "./outbound-orders/pick";
import transfersCreate from "./transfers/index";
import adjustmentsCreate from "./adjustments/index";
import movementsList from "./movements/index";
import dashboardSummary from "./dashboard/index";

// -----------------------------------------------------------------------------
// Single entry point for the whole API.
//
// Vercel turns every file under api/ into its own Serverless Function, and the
// Hobby plan caps a non-Next.js project at 12 of them — this API has 21 routes.
// So the handlers live outside api/ (in server/routes/) and this catch-all
// dispatches to them, which also means one warm instance and one Neon
// connection pool shared by every endpoint instead of 21 separate ones.
//
// Routing is explicit on purpose: the table below is the API surface, readable
// at a glance. Each handler still validates its own HTTP method, so the router
// only has to match paths.
// -----------------------------------------------------------------------------

interface Route {
  /** Path segments after /api. A segment starting with ":" captures a parameter. */
  pattern: string[];
  handler: Handler;
}

const ROUTES: Route[] = [
  { pattern: ["auth", "login"], handler: authLogin },
  { pattern: ["auth", "me"], handler: authMe },

  { pattern: ["items"], handler: itemsList },
  { pattern: ["items", ":id"], handler: itemsDetail },

  { pattern: ["categories"], handler: categoriesList },
  { pattern: ["categories", ":id"], handler: categoriesDetail },

  { pattern: ["warehouses"], handler: warehousesList },

  { pattern: ["locations"], handler: locationsList },
  { pattern: ["locations", ":id"], handler: locationsDetail },

  { pattern: ["stock"], handler: stockList },
  { pattern: ["stock", "item", ":id"], handler: stockByItem },

  { pattern: ["receipts"], handler: receiptsList },
  { pattern: ["receipts", ":id"], handler: receiptsDetail },
  { pattern: ["receipts", ":id", "receive"], handler: receiptsReceive },

  { pattern: ["outbound-orders"], handler: outboundList },
  { pattern: ["outbound-orders", ":id"], handler: outboundDetail },
  { pattern: ["outbound-orders", ":id", "pick"], handler: outboundPick },

  { pattern: ["transfers"], handler: transfersCreate },
  { pattern: ["adjustments"], handler: adjustmentsCreate },
  { pattern: ["movements"], handler: movementsList },
  { pattern: ["dashboard"], handler: dashboardSummary },
];

export function matchRoute(segments: string[]): { handler: Handler; params: RouteParams } | null {
  for (const route of ROUTES) {
    if (route.pattern.length !== segments.length) continue;

    const params: RouteParams = {};
    let matches = true;

    for (let i = 0; i < route.pattern.length; i++) {
      const expected = route.pattern[i]!;
      const actual = segments[i]!;
      if (expected.startsWith(":")) {
        params[expected.slice(1)] = actual;
      } else if (expected !== actual) {
        matches = false;
        break;
      }
    }

    if (matches) return { handler: route.handler, params };
  }
  return null;
}

/** Splits "/api/receipts/4/receive?x=1" into ["receipts", "4", "receive"]. */
export function pathSegments(url: string | undefined): string[] {
  const pathname = (url ?? "/").split("?")[0] ?? "/";
  return pathname
    .replace(/^\/+api\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
}

export const router = withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const match = matchRoute(pathSegments(req.url));
  if (!match) {
    throw ApiError.notFound("Endpoint no encontrado.");
  }
  await match.handler(req, res, match.params);
});
