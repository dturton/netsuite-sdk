import type { HttpMethod } from './http.js';

export interface NetSuiteErrorDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  'o:errorCode'?: string;
  'o:errorDetails'?: Array<{
    detail?: string;
    'o:errorCode'?: string;
    'o:errorPath'?: string;
  }>;
}

export class NetSuiteError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: NetSuiteErrorDetail;
  public readonly requestUrl?: string;
  public readonly requestMethod?: HttpMethod;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: NetSuiteErrorDetail,
    requestUrl?: string,
    requestMethod?: HttpMethod,
  ) {
    super(message);
    this.name = 'NetSuiteError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestUrl = requestUrl;
    this.requestMethod = requestMethod;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetSuiteError);
    }
  }

  /** Whether this is a retryable error (5xx, timeout, network) */
  get isRetryable(): boolean {
    return this.status >= 500 || this.code === 'TIMEOUT' || this.code === 'NETWORK_ERROR';
  }

  /** Whether this is an auth error (401, 403) */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  static isNetSuiteError(error: unknown): error is NetSuiteError {
    return error instanceof NetSuiteError;
  }
}
