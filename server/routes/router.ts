import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, type Handler, type RouteParams } from "../utils/http.js";
import { ApiError } from "../utils/errors.js";

import authLogin from "./auth/login.js";
import authMe from "./auth/me.js";
import itemsList from "./items/index.js";
import itemsDetail from "./items/detail.js";
import categoriesList from "./categories/index.js";
import categoriesDetail from "./categories/detail.js";
import warehousesList from "./warehouses/index.js";
import locationsList from "./locations/index.js";
import locationsDetail from "./locations/detail.js";
import stockList from "./stock/index.js";
import stockByItem from "./stock/by-item.js";
import receiptsList from "./receipts/index.js";
import receiptsDetail from "./receipts/detail.js";
import receiptsReceive from "./receipts/receive.js";
import outboundList from "./outbound-orders/index.js";
import outboundDetail from "./outbound-orders/detail.js";
import outboundPick from "./outbound-orders/pick.js";
import transfersCreate from "./transfers/index.js";
import adjustmentsCreate from "./adjustments/index.js";
import movementsList from "./movements/index.js";
import dashboardSummary from "./dashboard/index.js";

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
  return toSegments(pathname.replace(/^\/+api\/?/, ""));
}

function toSegments(rawPath: string): string[] {
  return rawPath.split("/").filter(Boolean).map(decodeURIComponent);
}

/**
 * vercel.json rewrites /api/<path> to /api?path=<path>, so in production the
 * route arrives in the query string. Falling back to the URL keeps the router
 * working when it is mounted directly (local dev server, tests).
 */
export function requestSegments(req: Pick<VercelRequest, "query" | "url">): string[] {
  const fromQuery = req.query?.path;
  const raw = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (raw) return toSegments(raw);
  return pathSegments(req.url);
}

export const router = withHandler(async (req: VercelRequest, res: VercelResponse) => {
  const match = matchRoute(requestSegments(req));
  if (!match) {
    throw ApiError.notFound("Endpoint no encontrado.");
  }
  await match.handler(req, res, match.params);
});
