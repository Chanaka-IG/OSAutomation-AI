import type { APIRequestContext } from '@playwright/test';

/**
 * Service object for HTTP APIs (same idea as POM: one class per area of the API).
 * Pass an {@link APIRequestContext} from the `apiContext` fixture (or `request` if baseURL matches).
 */
export abstract class BaseApiService {
  constructor(public readonly request: APIRequestContext) {}

  get(
    url: string,
    options?: Parameters<APIRequestContext['get']>[1],
  ): ReturnType<APIRequestContext['get']> {
    return this.request.get(url, options);
  }

  post(
    url: string,
    options?: Parameters<APIRequestContext['post']>[1],
  ): ReturnType<APIRequestContext['post']> {
    return this.request.post(url, options);
  }

  put(
    url: string,
    options?: Parameters<APIRequestContext['put']>[1],
  ): ReturnType<APIRequestContext['put']> {
    return this.request.put(url, options);
  }

  patch(
    url: string,
    options?: Parameters<APIRequestContext['patch']>[1],
  ): ReturnType<APIRequestContext['patch']> {
    return this.request.patch(url, options);
  }

  delete(
    url: string,
    options?: Parameters<APIRequestContext['delete']>[1],
  ): ReturnType<APIRequestContext['delete']> {
    return this.request.delete(url, options);
  }
}
