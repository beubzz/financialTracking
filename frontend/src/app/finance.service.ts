import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface ApiEntry { id: string; label: string; amount: string | number; recurrence: 'WEEK' | 'MONTH' | 'YEAR'; section: 'MANDATORY' | 'PLEASURE' | 'VARIABLE' | 'INVESTMENT'; type: 'INCOME' | 'EXPENSE'; category?: string | null; note?: string | null; occurredAt?: string | null; }
export interface MonthResponse { month: { entries: ApiEntry[] } }
export interface Goal { id: string; name: string; target: string | number; saved: string | number; targetDate?: string | null; }

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);
  getMonth(month?: string) { return this.http.get<MonthResponse>(`${environment.apiUrl}/finance/month`, { params: month ? { month } : {} }); }
  saveSalary(amount: number, month?: string) { return this.http.patch<{ salary: string | number }>(`${environment.apiUrl}/finance/salary`, { amount }, { params: month ? { month } : {} }); }
  addEntry(entry: { label: string; amount: number; section: 'mandatory' | 'pleasure' | 'variable' | 'investment'; recurrence: 'week' | 'month' | 'year'; category?: string; note?: string }, month?: string) { return this.http.post<{ entry: ApiEntry }>(`${environment.apiUrl}/finance/entries`, entry, { params: month ? { month } : {} }); }
  updateEntry(id: string, entry: Partial<{ label: string; amount: number; section: 'mandatory' | 'pleasure' | 'variable' | 'investment'; recurrence: 'week' | 'month' | 'year'; category: string; note: string }>, month?: string) { return this.http.patch<{ entry: ApiEntry }>(`${environment.apiUrl}/finance/entries/${id}`, entry, { params: month ? { month } : {} }); }
  deleteEntry(id: string) { return this.http.delete(`${environment.apiUrl}/finance/entries/${id}`); }
  getImportCandidates(mode: 'recurring' | 'all', month?: string, sourceMonth?: string) { return this.http.get<{ entries: ApiEntry[] }>(`${environment.apiUrl}/finance/entries/import-candidates`, { params: { mode, ...(month ? { month } : {}), ...(sourceMonth ? { sourceMonth } : {}) } }); }
  importEntries(mode: 'recurring' | 'all', selectedIds: string[], month?: string, sourceMonth?: string) { return this.http.post<{ imported: number; month: { entries: ApiEntry[] } }>(`${environment.apiUrl}/finance/entries/import-recurring`, { selectedIds }, { params: { mode, ...(month ? { month } : {}), ...(sourceMonth ? { sourceMonth } : {}) } }); }
  getGoals() { return this.http.get<{ goals: Goal[] }>(`${environment.apiUrl}/finance/goals`); }
  addGoal(goal: { name: string; target: number; saved?: number; targetDate?: string }) { return this.http.post<{ goal: Goal }>(`${environment.apiUrl}/finance/goals`, goal); }
  updateGoal(id: string, goal: Partial<{ name: string; target: number; saved: number; targetDate: string }>) { return this.http.patch<{ goal: Goal }>(`${environment.apiUrl}/finance/goals/${id}`, goal); }
  deleteGoal(id: string) { return this.http.delete(`${environment.apiUrl}/finance/goals/${id}`); }
}
