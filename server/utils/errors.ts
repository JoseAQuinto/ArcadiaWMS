export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }

  static unauthorized(message = "No autenticado.") {
    return new ApiError(401, message);
  }

  static forbidden(message = "No tienes permisos para realizar esta acción.") {
    return new ApiError(403, message);
  }

  static notFound(message = "Recurso no encontrado.") {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }
}
