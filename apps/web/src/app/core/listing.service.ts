import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { Category, Listing, Paginated } from './models';

export interface ListingQuery {
  kind?: 'OFFER' | 'NEED';
  category?: string;
  modality?: 'BARTER' | 'CASH' | 'BOTH';
  q?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'recent' | 'popular' | 'price_asc' | 'price_desc';
  status?: string;
  owner?: string;
  page?: number;
  limit?: number;
}

export interface ListingPayload {
  kind: 'OFFER' | 'NEED';
  title: string;
  description: string;
  categoryId: string;
  condition: string;
  modality: string;
  priceCents: number;
  currency?: string;
  location: string;
  tags: string[];
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly api = inject(ApiService);

  list(query: ListingQuery = {}): Observable<Paginated<Listing>> {
    return this.api.get<Paginated<Listing>>('/listings', query as Record<string, unknown>);
  }

  get(id: string): Observable<Listing & { related: Listing[] }> {
    return this.api.get<Listing & { related: Listing[] }>(`/listings/${id}`);
  }

  mine(): Observable<{ items: Listing[] }> {
    return this.api.get<{ items: Listing[] }>('/listings/mine');
  }

  favorites(): Observable<{ items: Listing[] }> {
    return this.api.get<{ items: Listing[] }>('/users/me/favorites');
  }

  create(payload: ListingPayload): Observable<Listing> {
    return this.api.post<Listing>('/listings', payload);
  }

  update(id: string, payload: Partial<ListingPayload>): Observable<Listing> {
    return this.api.patch<Listing>(`/listings/${id}`, payload);
  }

  setStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED', reason?: string): Observable<Listing> {
    return this.api.patch<Listing>(`/listings/${id}/status`, { status, reason });
  }

  remove(id: string): Observable<{ removed: boolean; status: string }> {
    return this.api.delete<{ removed: boolean; status: string }>(`/listings/${id}`);
  }

  toggleFavorite(id: string): Observable<{ favorited: boolean; favoritesCount: number }> {
    return this.api.post<{ favorited: boolean; favoritesCount: number }>(`/listings/${id}/favorite`);
  }
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);

  list(): Observable<{ items: Category[]; total: number }> {
    return this.api.get<{ items: Category[]; total: number }>('/categories');
  }
}
