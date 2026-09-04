/**
 * The one and only Vercel Function of this project.
 *
 * Vercel turns every file under api/ into its own Serverless Function, and the
 * Hobby plan caps a non-Next.js project at 12 — this API has 21 routes. So the
 * handlers live in server/routes/ (outside api/, where Vercel won't see them)
 * and this catch-all hands every /api/* request to the router.
 *
 * Keeping this file to a re-export means the routing logic sits in server/,
 * next to everything else it belongs with, and stays unit-testable.
 */
export { router as default } from "../server/routes/router";
