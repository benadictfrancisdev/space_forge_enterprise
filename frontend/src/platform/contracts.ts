/**
 * SpaceForge Enterprise Platform — service contracts.
 * Phase 0.0: interfaces only. Real adapters arrive in later phases
 * (REST → Django / FastAPI). No third-party BaaS coupling.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/** Identity & session — Firebase remains the interim identity provider. */
export interface AuthService {
  getIdToken(): Promise<string | null>;
  getUserId(): string | null;
  getEmail(): string | null;
}

/** Domain AI / compute operations (replaces edge-function action soup). */
export interface AIService {
  invoke<T = unknown>(
    operation: string,
    payload?: Record<string, unknown>
  ): Promise<ServiceResult<T>>;
}

/** Named backend capability invokes (billing, connectors, events, etc.). */
export interface BackendFunctionService {
  invoke<T = unknown>(
    name: string,
    body?: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<ServiceResult<T>>;
}

/** Persistence — future Django/Postgres REST. */
export interface DatabaseService {
  from(table: string): QueryBuilder;
}

export interface QueryBuilder {
  select(columns?: string): QueryBuilder;
  insert(values: unknown): QueryBuilder;
  update(values: unknown): QueryBuilder;
  upsert(values: unknown, options?: Record<string, unknown>): QueryBuilder;
  delete(): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  neq(column: string, value: unknown): QueryBuilder;
  gt(column: string, value: unknown): QueryBuilder;
  gte(column: string, value: unknown): QueryBuilder;
  lt(column: string, value: unknown): QueryBuilder;
  lte(column: string, value: unknown): QueryBuilder;
  like(column: string, value: string): QueryBuilder;
  ilike(column: string, value: string): QueryBuilder;
  is(column: string, value: unknown): QueryBuilder;
  in(column: string, values: unknown[]): QueryBuilder;
  contains(column: string, value: unknown): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  limit(count: number): QueryBuilder;
  range(from: number, to: number): QueryBuilder;
  single(): Promise<ServiceResult<unknown>>;
  maybeSingle(): Promise<ServiceResult<unknown>>;
  then<TResult1 = ServiceResult<unknown>, TResult2 = never>(
    onfulfilled?:
      | ((value: ServiceResult<unknown>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>;
}

/** Object storage — future S3-compatible adapter. */
export interface StorageService {
  upload(bucket: string, path: string, file: Blob | File): Promise<ServiceResult<{ path: string }>>;
  getPublicUrl(bucket: string, path: string): string;
  download(bucket: string, path: string): Promise<ServiceResult<Blob>>;
}

/** Push / WhatsApp / email — future notification platform. */
export interface NotificationService {
  send(channel: string, payload: Record<string, unknown>): Promise<ServiceResult<unknown>>;
}

/** Live collaboration / streams — future websocket service. */
export interface RealtimeService {
  channel(name: string): RealtimeChannel;
  removeChannel(channel: RealtimeChannel): Promise<"ok" | "error" | "timed out">;
}

export type RealtimeChannel = {
  on(
    type: string,
    filter: Record<string, unknown> | ((...args: unknown[]) => void),
    callback?: (...args: unknown[]) => void
  ): RealtimeChannel;
  subscribe(callback?: (status: string) => void): RealtimeChannel;
  unsubscribe(): Promise<"ok" | "error" | "timed out">;
  send(payload: Record<string, unknown>): Promise<"ok" | "error" | "timed out">;
  track(payload: Record<string, unknown>): Promise<"ok" | "error" | "timed out">;
  untrack(): Promise<"ok" | "error" | "timed out">;
};
