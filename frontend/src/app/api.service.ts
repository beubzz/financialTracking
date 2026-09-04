import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  health() { return this.http.get<{ status: string }>(`${environment.apiUrl.replace('/api/v1', '')}/health`); }
}
