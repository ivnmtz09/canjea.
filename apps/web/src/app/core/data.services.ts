import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import type { AdminStats, AuditLog, AdminUser, Deal, DealMessage, Notification, Paginated, Wallet } from './models';

export interface CreateDealPayload {
  listingId: string;
  message: string;
  offerListingId?: string | null;
  cashCents: number;
}

@Injectable({ providedIn: 'root' })
export class DealService {
  private readonly api = inject(ApiService);

  list(query: { role?: 'all' | 'incoming' | 'outgoing'; status?: string } = {}): Observable<{
    items: Deal[];
    counts: Record<string, number>;
    pendingIncoming: number;
  }> {
    return this.api.get('/deals', query as Record<string, unknown>);
  }

  get(id: string): Observable<Deal> {
    return this.api.get<Deal>(`/deals/${id}`);
  }

  create(payload: CreateDealPayload): Observable<Deal> {
    return this.api.post<Deal>('/deals', payload);
  }

  respond(id: string, action: 'accept' | 'reject'): Observable<Deal> {
    return this.api.patch<Deal>(`/deals/${id}/respond`, { action });
  }

  complete(id: string): Observable<Deal> {
    return this.api.patch<Deal>(`/deals/${id}/complete`);
  }

  cancel(id: string, reason?: string): Observable<Deal> {
    return this.api.patch<Deal>(`/deals/${id}/cancel`, { reason });
  }

  review(id: string, rating: number, comment: string): Observable<Deal> {
    return this.api.post<Deal>(`/deals/${id}/review`, { rating, comment });
  }

  messages(id: string): Observable<DealMessage[]> {
    return this.api.get<{ items: DealMessage[] }>(`/deals/${id}/messages`).pipe(map((res) => res.items));
  }

  sendMessage(id: string, content: string): Observable<DealMessage> {
    return this.api.post<DealMessage>(`/deals/${id}/messages`, { content });
  }
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly api = inject(ApiService);

  get(): Observable<Wallet> {
    return this.api.get<Wallet>('/wallet');
  }

  topUp(amountCents: number): Observable<Wallet> {
    return this.api.post<Wallet>('/wallet/topup', { amountCents });
  }

  withdraw(amountCents: number): Observable<Wallet> {
    return this.api.post<Wallet>('/wallet/withdraw', { amountCents });
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);

  list(unreadOnly = false): Observable<{ items: Notification[]; unread: number }> {
    return this.api.get('/notifications', unreadOnly ? { unread: 'true' } : {});
  }

  markRead(id: string): Observable<{ read: boolean }> {
    return this.api.patch(`/notifications/${id}/read`);
  }

  markAllRead(): Observable<{ read: boolean }> {
    return this.api.patch('/notifications/read-all');
  }
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  stats(): Observable<AdminStats> {
    return this.api.get<AdminStats>('/admin/stats');
  }

  users(query: { q?: string; role?: string; status?: string; page?: number; limit?: number } = {}): Observable<Paginated<AdminUser>> {
    return this.api.get<Paginated<AdminUser>>('/users', query as Record<string, unknown>);
  }

  setRole(id: string, role: string): Observable<AdminUser> {
    return this.api.patch<AdminUser>(`/users/${id}/role`, { role });
  }

  setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', reason?: string): Observable<{ status: string }> {
    return this.api.patch(`/users/${id}/status`, { status, reason });
  }

  audit(page = 1): Observable<{ items: AuditLog[]; meta: { total: number } }> {
    return this.api.get('/admin/audit', { page, limit: 30 });
  }
}
