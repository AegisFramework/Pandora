/**
 * Typed handle to a single Registry state key.
 *
 * The object returned by `createState` exposes the small surface you need to
 * work with a global value: read it, write it, subscribe to changes, check
 * whether it exists, and delete it. Everything is strongly typed against the
 * generic parameter you pass to `createState`.
 */
export interface TypedState<T> {
    /** The underlying Registry state key. */
    readonly key: string;
    /** Read the current value. Returns `undefined` if the key was never set or has been deleted. */
    get(): T | undefined;
    /** Write a new value. The type is checked against the state's generic parameter. */
    set(value: T): void;
    /**
     * Subscribe to changes. The callback runs every time the value is updated,
     * receiving the new and previous values. Returns an unsubscribe function.
     */
    subscribe(callback: (newValue: T | undefined, oldValue: T | undefined) => void): () => void;
    /** Return `true` if the key currently has a value in the Registry. */
    has(): boolean;
    /** Remove the key from the Registry. Subsequent `get()` calls return `undefined`. */
    delete(): void;
}
/**
 * Create a typed wrapper around a Registry global state key.
 *
 * Registry state is string-keyed and untyped by default. `createState` gives
 * you a small typed handle so reads, writes, and subscriptions are checked at
 * compile time. If you pass a `defaultValue`, it is written to the Registry
 * immediately when the key does not yet exist, which makes it safe to call
 * during module initialization.
 *
 * @param key - The Registry state key to wrap.
 * @param defaultValue - Optional value to seed the key with if it is not already set.
 * @returns A typed handle with `get`, `set`, `subscribe`, `has`, and `delete`.
 *
 * @example
 * type AppState = { theme: 'light' | 'dark'; user: { id: string } | null };
 *
 * const state = {
 *   theme: createState<AppState['theme']>('app.theme', 'light'),
 *   user: createState<AppState['user']>('app.user', null),
 * };
 *
 * state.theme.set('dark');
 * const unsubscribe = state.user.subscribe(user => console.log(user));
 */
export declare function createState<T>(key: string, defaultValue?: T): TypedState<T>;
//# sourceMappingURL=TypedState.d.ts.map