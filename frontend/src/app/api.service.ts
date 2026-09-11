import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /**
   * Checks whether the backend API is reachable.
   *
   * @returns A promise containing the API health status.
   */
  health(): Promise<{ status: string }> {
    return firstValueFrom(
      this.http.get<{ status: string }>(`${environment.apiUrl.replace('/api/v1', '')}/health`),
    );
  }
}
