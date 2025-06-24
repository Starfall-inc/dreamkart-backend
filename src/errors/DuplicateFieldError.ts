// src/errors/DuplicateFieldError.ts
export class DuplicateFieldError extends Error {
  public field: string;
  constructor(field: string) {
    super(`Duplicate ${field} already exists.`);
    this.name = 'DuplicateFieldError';
    this.field = field;
  }
}
