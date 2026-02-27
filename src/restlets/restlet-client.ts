import type { HttpTransport } from '../transport/http-transport.js';
import type { RequestOptions, NetSuiteResponse } from '../types/http.js';

export interface RestletParams {
  /** Script ID of the RESTlet */
  script: string | number;
  /** Deploy ID of the RESTlet */
  deploy: string | number;
  /** Additional query parameters */
  params?: Record<string, string | number | boolean>;
}

/**
 * Client for calling NetSuite RESTlets.
 * Auto-builds the RESTlet URL from account ID, script, and deploy IDs.
 */
export class RestletClient {
  private transport: HttpTransport;
  private baseUrl: string;

  constructor(transport: HttpTransport, accountId: string) {
    this.transport = transport;
    const normalizedId = accountId.toLowerCase().replace(/_/g, '-');
    this.baseUrl = `https://${normalizedId}.restlets.api.netsuite.com/app/site/hosting/restlet.nl`;
  }

  /** Execute a RESTlet call */
  async call<T = unknown>(
    restlet: RestletParams,
    options?: RequestOptions,
  ): Promise<NetSuiteResponse<T>> {
    const searchParams = new URLSearchParams({
      script: String(restlet.script),
      deploy: String(restlet.deploy),
    });

    if (restlet.params) {
      for (const [key, value] of Object.entries(restlet.params)) {
        searchParams.set(key, String(value));
      }
    }

    const url = `${this.baseUrl}?${searchParams.toString()}`;
    return this.transport.request<T>(url, options);
  }
}
