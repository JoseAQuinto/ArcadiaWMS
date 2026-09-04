/**
 * The one and only Vercel Function of this project.
 *
 * Vercel turns every file under api/ into its own Serverless Function, and the
 * Hobby plan caps a non-Next.js project at 12 — this API has 21 routes. So the
 * handlers live in server/routes/ (outside api/, where Vercel won't see them)
 * and every /api/* request is rewritten here by vercel.json:
 *
 *   { "source": "/api/(.*)", "destination": "/api?path=$1" }
 *
 * An explicit rewrite rather than a [...path] catch-all filename: the catch-all
 * only matched a single segment in practice, so /api/auth/login never reached
 * the function at all. The rewrite is unambiguous and framework-independent.
 *
 * Keeping this file to a re-export means the routing logic sits in server/,
 * next to everything else it belongs with, and stays unit-testable.
 */
export { router as default } from "../server/routes/router.js";
