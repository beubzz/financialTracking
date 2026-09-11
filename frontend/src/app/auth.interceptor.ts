import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Adds the stored bearer token to outgoing API requests.
 *
 * @param request The outgoing HTTP request.
 * @param next The next interceptor or backend handler.
 * @returns The observable produced by the next handler.
 */
export const authInterceptor: HttpInterceptorFn = (
  request,
  next,
): ReturnType<HttpInterceptorFn> => {
  const token = localStorage.getItem('ledgerly_token');
  if (!token) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
