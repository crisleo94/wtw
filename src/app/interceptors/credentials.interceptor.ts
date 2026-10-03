import { HttpInterceptorFn } from '@angular/common/http';
import { API_URL } from '../constants';

// The API lives on its own domain and keeps the JWT in an httpOnly cookie: send it.
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith(`${API_URL}/`) ? next(req.clone({ withCredentials: true })) : next(req);
