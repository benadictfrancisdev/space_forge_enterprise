/**
 * Phase 0.0 stub adapters — compile-safe, no network I/O.
 * Replace with REST adapters in Phase 0.1+.
 */

import type {
  AIService,
  AuthService,
  BackendFunctionService,
  DatabaseService,
  NotificationService,
  QueryBuilder,
  RealtimeChannel,
  RealtimeService,
  ServiceResult,
  StorageService,
} from "./contracts";
import { auth as firebaseAuth } from "@/lib/firebase";

const unavailable = (feature: string): Error =>
  new Error(`[SpaceForge] ${feature} is not connected. Enterprise backend pending.`);

const emptyResult = <T = unknown>(): ServiceResult<T> => ({
  data: null,
  error: unavailable("backend"),
});

export class StubAuthService implements AuthService {
  async getIdToken(): Promise<string | null> {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }
  getUserId(): string | null {
    return firebaseAuth.currentUser?.uid ?? null;
  }
  getEmail(): string | null {
    return firebaseAuth.currentUser?.email ?? null;
  }
}

class StubQueryBuilder implements QueryBuilder {
  select(_columns?: string) {
    return this;
  }
  insert(_values: unknown) {
    return this;
  }
  update(_values: unknown) {
    return this;
  }
  upsert(_values: unknown, _options?: Record<string, unknown>) {
    return this;
  }
  delete() {
    return this;
  }
  eq(_column: string, _value: unknown) {
    return this;
  }
  neq(_column: string, _value: unknown) {
    return this;
  }
  gt(_column: string, _value: unknown) {
    return this;
  }
  gte(_column: string, _value: unknown) {
    return this;
  }
  lt(_column: string, _value: unknown) {
    return this;
  }
  lte(_column: string, _value: unknown) {
    return this;
  }
  like(_column: string, _value: string) {
    return this;
  }
  ilike(_column: string, _value: string) {
    return this;
  }
  is(_column: string, _value: unknown) {
    return this;
  }
  in(_column: string, _values: unknown[]) {
    return this;
  }
  contains(_column: string, _value: unknown) {
    return this;
  }
  order(_column: string, _options?: { ascending?: boolean }) {
    return this;
  }
  limit(_count: number) {
    return this;
  }
  range(_from: number, _to: number) {
    return this;
  }
  async single(): Promise<ServiceResult<unknown>> {
    return emptyResult();
  }
  async maybeSingle(): Promise<ServiceResult<unknown>> {
    return { data: null, error: null };
  }
  then<TResult1 = ServiceResult<unknown>, TResult2 = never>(
    onfulfilled?:
      | ((value: ServiceResult<unknown>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    // Default list queries resolve to empty arrays so UI tables render empty states.
    return Promise.resolve({ data: [] as unknown, error: null } as ServiceResult<unknown>).then(
      onfulfilled,
      onrejected
    );
  }
}

export class StubDatabaseService implements DatabaseService {
  from(_table: string): QueryBuilder {
    return new StubQueryBuilder();
  }
}

export class StubAIService implements AIService {
  async invoke<T = unknown>(
    _operation: string,
    _payload?: Record<string, unknown>
  ): Promise<ServiceResult<T>> {
    return emptyResult<T>();
  }
}

export class StubBackendFunctionService implements BackendFunctionService {
  async invoke<T = unknown>(
    _name: string,
    _body?: Record<string, unknown>,
    _headers?: Record<string, string>
  ): Promise<ServiceResult<T>> {
    return emptyResult<T>();
  }
}

export class StubStorageService implements StorageService {
  async upload(_bucket: string, _path: string, _file: Blob | File) {
    return emptyResult<{ path: string }>();
  }
  getPublicUrl(_bucket: string, path: string) {
    return path;
  }
  async download(_bucket: string, _path: string) {
    return emptyResult<Blob>();
  }
}

export class StubNotificationService implements NotificationService {
  async send(_channel: string, _payload: Record<string, unknown>) {
    return emptyResult();
  }
}

class StubRealtimeChannel implements RealtimeChannel {
  on(
    _type: string,
    _filter: Record<string, unknown> | ((...args: unknown[]) => void),
    _callback?: (...args: unknown[]) => void
  ) {
    return this;
  }
  subscribe(callback?: (status: string) => void) {
    callback?.("CLOSED");
    return this;
  }
  async unsubscribe() {
    return "ok" as const;
  }
  async send(_payload: Record<string, unknown>) {
    return "error" as const;
  }
  async track(_payload: Record<string, unknown>) {
    return "error" as const;
  }
  async untrack() {
    return "ok" as const;
  }
}

export class StubRealtimeService implements RealtimeService {
  channel(_name: string): RealtimeChannel {
    return new StubRealtimeChannel();
  }
  async removeChannel(_channel: RealtimeChannel) {
    return "ok" as const;
  }
}
