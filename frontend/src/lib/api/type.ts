export interface ApiError {
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
  timestamp: string;
}

export class ApiClientError extends Error {
  status: number;
  apiError?: ApiError;

  constructor(status: number, apiError?: ApiError) {
    super(apiError?.message ?? `HTTP ${status}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.apiError = apiError;
  }
}