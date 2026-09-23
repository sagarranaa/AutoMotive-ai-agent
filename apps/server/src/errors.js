export class AppError extends Error {
  constructor(message, status=400, code='VALIDATION_ERROR') { super(message); this.status=status; this.code=code; }
}
export function publicError(error) {
  if(error instanceof AppError) return {error:error.message, code:error.code};
  return {error:'The request could not be completed. Please try again.',code:'INTERNAL_ERROR'};
}
