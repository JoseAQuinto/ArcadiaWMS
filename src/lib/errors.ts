import { ApiRequestError } from "@/services/api";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ha ocurrido un error inesperado.";
}
