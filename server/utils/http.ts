import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError } from "zod";
import { ApiError } from "./errors.js";

/** Path parameters captured by the router in api/[...path].ts (e.g. { id: "42" }). */
export type RouteParams = Record<string, string | undefined>;

export type Handler = (
  req: VercelRequest,
  res: VercelResponse,
  params: RouteParams
) => Promise<void> | void;

/**
 * Wraps a Vercel function handler so every route gets the same
 * { success: true, data } / { success: false, message } response shape and
 * consistent HTTP status codes, without repeating try/catch in every file.
 */
export function withHandler(handler: Handler): Handler {
  return async (req, res, params) => {
    try {
      await handler(req, res, params);
    } catch (error) {
      handleError(res, error);
    }
  };
}

function handleError(res: VercelResponse, error: unknown) {
  if (error instanceof ApiError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Datos de la petición no válidos.";
    res.status(400).json({ success: false, message });
    return;
  }
  console.error(error);
  res.status(500).json({ success: false, message: "Error interno del servidor." });
}

export function sendSuccess<T>(res: VercelResponse, data: T, status = 200) {
  res.status(status).json({ success: true, data });
}

export function requireMethod(req: VercelRequest, ...methods: string[]): void {
  if (!req.method || !methods.includes(req.method)) {
    throw new ApiError(405, `Método no permitido. Usa: ${methods.join(", ")}.`);
  }
}

/** Vercel puts repeated query params in arrays; our API only ever expects a single value per key. */
export function flattenQuery(query: VercelRequest["query"]): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    result[key] = Array.isArray(value) ? value[0] : value;
  }
  return result;
}

export function parseIdParam(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest("Identificador no válido.");
  }
  return id;
}
