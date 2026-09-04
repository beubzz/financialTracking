import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface ApiEntry { id: string; label: string; amount: string | number; recurrence: 'WEEK' | 'MONTH' | 'YEAR'; section: 'MANDATORY' | 'PLEASURE'; type: 'INCOME' | 'EXPENSE'; }
export interface MonthResponse { month: { entries: ApiEntry[] } }

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);
  getMonth() { return this.http.get<MonthResponse>(`${environment.apiUrl}/finance/month`); }
  saveSalary(amount: number) { return this.http.patch<{ salary: string | number }>(`${environment.apiUrl}/finance/salary`, { amount }); }
  addEntry(entry: { label: string; amount: number; section: 'mandatory' | 'pleasure'; recurrence: 'week' | 'month' | 'year' }) { return this.http.post<{ entry: ApiEntry }>(`${environment.apiUrl}/finance/entries`, entry); }
  deleteEntry(id: string) { return this.http.delete(`${environment.apiUrl}/finance/entries/${id}`); }
}
