import axios, { type AxiosInstance, type AxiosError } from 'axios';
import http from 'node:http';
import https from 'node:https';
import { createOAuthSigner } from './oauth.js';
import { withRetry } from './retry.js';
import { executeMiddlewareChain } from './middleware-chain.js';
import { NetSuiteError } from '../types/errors.js';
import { extractHeaders } from '../types/http.js';
import type { NetSuiteConfig } from '../types/config.js';
import type { HttpMethod, RequestOptions, NetSuiteResponse } from '../types/http.js';
import type { Middleware, RequestContext, ResponseContext } from '../types/middleware.js';
import type { Logger } from '../types/logger.js';

interface ResolvedConfig {
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  defaultHeaders: Record<string, string>;
  logger?: Logger;
}

export class HttpTransport {
  private sign: (url: string, method: HttpMethod) => Record<string, string>;
  private axiosInstance: AxiosInstance;
  private middlewares: Middleware[] = [];
  private config: ResolvedConfig;

  constructor(config: NetSuiteConfig) {
    this.config = {
      timeout: config.timeout ?? 30_000,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      defaultHeaders: config.defaultHeaders ?? {},
      logger: config.logger,
    };

    this.sign = createOAuthSigner(config.auth);

    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
      maxRedirects: 5,
      // Let us handle all status codes in our error handling
      validateStatus: () => true,
    });
  }

  /** Add a middleware to the chain. Returns `this` for chaining. */
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /** Execute an HTTP request with OAuth signing, retry, and middleware. */
  async request<T = unknown>(
    url: string,
    options: RequestOptions = {},
  ): Promise<NetSuiteResponse<T>> {
    const method = options.method ?? 'GET';
    const timeout = options.timeout ?? this.config.timeout;
    const maxRetries = options.maxRetries ?? this.config.maxRetries;

    return withRetry(
      async () => {
        // Re-sign on each attempt (fresh nonce/timestamp)
        const authHeaders = this.sign(url, method);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...this.config.defaultHeaders,
          ...authHeaders,
          ...options.headers,
        };

        const context: RequestContext = {
          url,
          method,
          headers,
          body: options.body,
          metadata: {},
        };

        // Execute middleware chain, then the actual HTTP call
        const response = await executeMiddlewareChain(
          this.middlewares,
          context,
          () => this.executeRequest<T>(context, timeout),
        );

        return {
          data: response.body as T,
          status: response.status,
          headers: response.headers,
          duration: response.duration,
        };
      },
      {
        maxRetries,
        initialDelay: this.config.retryDelay,
        shouldRetry: (error) => {
          if (error instanceof NetSuiteError) {
            return error.isRetryable;
          }
          return true;
        },
        onRetry: (error, attempt) => {
          this.config.logger?.warn(`Retry attempt ${attempt}/${maxRetries}`, {
            url,
            method,
            error,
          });
        },
      },
    );
  }

  private async executeRequest<T>(
    context: RequestContext,
    timeout: number,
  ): Promise<ResponseContext> {
    const startTime = performance.now();

    try {
      this.config.logger?.debug(`${context.method} ${context.url}`, {
        headers: Object.keys(context.headers),
      });

      const response = await this.axiosInstance.request({
        url: context.url,
        method: context.method,
        headers: context.headers,
        data:
          context.body && ['POST', 'PUT', 'PATCH'].includes(context.method)
            ? context.body
            : undefined,
        timeout,
      });

      const duration = Math.round(performance.now() - startTime);

      this.config.logger?.info(`${context.method} ${context.url} → ${response.status}`, {
        duration,
      });

      // Throw on non-2xx responses
      if (response.status >= 400) {
        const errorBody = response.data ?? {};
        const message =
          errorBody.detail ??
          errorBody.title ??
          errorBody.message ??
          `HTTP ${response.status}`;
        const code =
          errorBody['o:errorCode'] ??
          errorBody.code ??
          `HTTP_${response.status}`;

        throw new NetSuiteError(
          message,
          response.status,
          code,
          errorBody,
          context.url,
          context.method,
        );
      }

      return {
        status: response.status,
        headers: extractHeaders(response),
        body: response.status === 204 ? undefined : response.data,
        duration,
      };
    } catch (error) {
      if (error instanceof NetSuiteError) {
        throw error;
      }

      const duration = Math.round(performance.now() - startTime);
      const axiosError = error as AxiosError;

      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_CANCELED') {
        throw new NetSuiteError(
          `Request timed out after ${timeout}ms`,
          504,
          'TIMEOUT',
          undefined,
          context.url,
          context.method,
        );
      }

      throw new NetSuiteError(
        axiosError.message || 'Network error',
        0,
        'NETWORK_ERROR',
        undefined,
        context.url,
        context.method,
      );
    }
  }
}
