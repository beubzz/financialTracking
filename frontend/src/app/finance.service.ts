import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

export interface ApiEntry {
  id: string;
  label: string;
  amount: string | number;
  recurrence: 'UNIQUE' | 'WEEK' | 'MONTH' | 'YEAR';
  section: 'MANDATORY' | 'PLEASURE' | 'VARIABLE' | 'INVESTMENT';
  type: 'INCOME' | 'EXPENSE';
  category?: string | null;
  note?: string | null;
  occurredAt?: string | null;
  parentId?: string | null;
}
export interface MonthResponse {
  month: { entries: ApiEntry[] };
}
export interface Goal {
  id: string;
  name: string;
  target: string | number;
  saved: string | number;
  targetDate?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly http = inject(HttpClient);

  /**
   * Loads the authenticated user's financial month.
   *
   * @param month Optional YYYY-MM month to load.
   * @returns A promise containing the month and its entries.
   */
  getMonth(month?: string): Promise<MonthResponse> {
    return firstValueFrom(
      this.http.get<MonthResponse>(`${environment.apiUrl}/finance/month`, {
        params: month ? { month } : {},
      }),
    );
  }
  /**
   * Saves the salary entry for a financial month.
   *
   * @param amount The positive monthly salary amount.
   * @param month Optional YYYY-MM month to update.
   * @returns A promise containing the persisted salary amount.
   */
  saveSalary(amount: number, month?: string): Promise<{ salary: string | number }> {
    return firstValueFrom(
      this.http.patch<{ salary: string | number }>(
        `${environment.apiUrl}/finance/salary`,
        { amount },
        { params: month ? { month } : {} },
      ),
    );
  }

  /**
   * Creates a financial entry in a month.
   *
   * @param entry The entry data to persist.
   * @param month Optional YYYY-MM month receiving the entry.
   * @returns A promise containing the created entry.
   */
  addEntry(
    entry: {
      label: string;
      amount: number;
      section: 'mandatory' | 'pleasure' | 'variable' | 'investment';
      recurrence: 'unique' | 'week' | 'month' | 'year';
      category?: string;
      note?: string;
      parentId?: string;
    },
    month?: string,
  ): Promise<{ entry: ApiEntry }> {
    return firstValueFrom(
      this.http.post<{ entry: ApiEntry }>(`${environment.apiUrl}/finance/entries`, entry, {
        params: month ? { month } : {},
      }),
    );
  }

  /**
   * Updates an existing financial entry.
   *
   * @param id The identifier of the entry to update.
   * @param entry The partial entry data to persist.
   * @param month Optional YYYY-MM month containing the entry.
   * @returns A promise containing the updated entry.
   */
  updateEntry(
    id: string,
    entry: Partial<{
      label: string;
      amount: number;
      section: 'mandatory' | 'pleasure' | 'variable' | 'investment';
      recurrence: 'unique' | 'week' | 'month' | 'year';
      category: string;
      note: string;
      parentId: string;
    }>,
    month?: string,
  ): Promise<{ entry: ApiEntry }> {
    return firstValueFrom(
      this.http.patch<{ entry: ApiEntry }>(`${environment.apiUrl}/finance/entries/${id}`, entry, {
        params: month ? { month } : {},
      }),
    );
  }

  /**
   * Deletes a financial entry.
   *
   * @param id The entry identifier to delete.
   * @returns A promise that resolves when deletion succeeds.
   */
  deleteEntry(id: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${environment.apiUrl}/finance/entries/${id}`));
  }
  /**
   * Loads entries available for import from another month.
   *
   * @param mode Whether to load recurring entries or all expenses.
   * @param month Optional target YYYY-MM month.
   * @param sourceMonth Optional source YYYY-MM month.
   * @returns A promise containing import candidates.
   */
  getImportCandidates(
    mode: 'recurring' | 'all',
    month?: string,
    sourceMonth?: string,
  ): Promise<{ entries: ApiEntry[] }> {
    return firstValueFrom(
      this.http.get<{ entries: ApiEntry[] }>(
        `${environment.apiUrl}/finance/entries/import-candidates`,
        { params: { mode, ...(month ? { month } : {}), ...(sourceMonth ? { sourceMonth } : {}) } },
      ),
    );
  }

  /**
   * Imports selected entries into a target month.
   *
   * @param mode Whether the source candidates are recurring or all expenses.
   * @param selectedIds The identifiers of entries to import.
   * @param month Optional target YYYY-MM month.
   * @param sourceMonth Optional source YYYY-MM month.
   * @returns A promise containing the import count and refreshed month.
   */
  importEntries(
    mode: 'recurring' | 'all',
    selectedIds: string[],
    month?: string,
    sourceMonth?: string,
  ): Promise<{ imported: number; month: { entries: ApiEntry[] } }> {
    return firstValueFrom(
      this.http.post<{ imported: number; month: { entries: ApiEntry[] } }>(
        `${environment.apiUrl}/finance/entries/import-recurring`,
        { selectedIds },
        { params: { mode, ...(month ? { month } : {}), ...(sourceMonth ? { sourceMonth } : {}) } },
      ),
    );
  }
  /**
   * Loads all savings goals for the authenticated user.
   *
   * @returns A promise containing the user's goals.
   */
  getGoals(): Promise<{ goals: Goal[] }> {
    return firstValueFrom(this.http.get<{ goals: Goal[] }>(`${environment.apiUrl}/finance/goals`));
  }

  /**
   * Creates a savings goal.
   *
   * @param goal The goal data to persist.
   * @returns A promise containing the created goal.
   */
  addGoal(goal: {
    name: string;
    target: number;
    saved?: number;
    targetDate?: string;
  }): Promise<{ goal: Goal }> {
    return firstValueFrom(
      this.http.post<{ goal: Goal }>(`${environment.apiUrl}/finance/goals`, goal),
    );
  }

  /**
   * Updates an existing savings goal.
   *
   * @param id The identifier of the goal to update.
   * @param goal The partial goal data to persist.
   * @returns A promise containing the updated goal.
   */
  updateGoal(
    id: string,
    goal: Partial<{ name: string; target: number; saved: number; targetDate: string }>,
  ): Promise<{ goal: Goal }> {
    return firstValueFrom(
      this.http.patch<{ goal: Goal }>(`${environment.apiUrl}/finance/goals/${id}`, goal),
    );
  }
  /**
   * Deletes a savings goal.
   *
   * @param id The goal identifier to delete.
   * @returns A promise that resolves when deletion succeeds.
   */
  deleteGoal(id: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${environment.apiUrl}/finance/goals/${id}`));
  }
}
