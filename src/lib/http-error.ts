import type { Response } from "express";

const DEFAULT_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
};

export class HttpError extends Error {
  public status: number
  public code: string
  public details?: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code ?? DEFAULT_CODES[status] ?? "ERROR"
    this.details = details
  }
}

// Formato uniforme de error (RNF-S1-02): { error: { code, message } }
export function sendError(res: Response, error: unknown) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined && { details: error.details }),
      },
    });
  }

  console.error(error);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Error interno del servidor." },
  });
}
