import { TemplateResult } from 'lit-html';
import { CSSObject, DecoratorInstance, DecoratorEffect, ReactiveOptions } from './Types';
/**
 * Invokes a callback and always returns a Promise, regardless of whether the
 * callback itself is sync or async. Lets hooks that may or may not be
 * declared `async` be awaited uniformly without branching at each call site.
 *
 * @internal
 */
export declare function callAsync<T>(callable: (...args: any[]) => T, context: any, ...args: any[]): Promise<T>;
/**
 * Duck-types a value as a lit-html `TemplateResult` by looking for its
 * `_$litType$` brand. We avoid `instanceof` so the check survives across
 * realms and when multiple lit-html copies coexist in the same page.
 *
 * @internal
 */
export declare function isTemplateResult(value: unknown): value is TemplateResult;
/**
 * Flattens a nested `CSSObject` into a CSS string for injection at render
 * time. When `encapsulation` is a tag selector (light-DOM mode), selectors
 * are scoped under it — `:host` maps to the tag, `&`-prefixed rules nest
 * inline, at-rules pass through untouched, and everything else is prefixed.
 *
 * @internal
 */
export declare function deserializeCSS(object: CSSObject, encapsulation?: string, level?: number): string;
/** Metadata slot: array of attribute names that `@Attribute` wants observed on the element. @internal */
export declare const PROP_ATTRIBUTES: unique symbol;
/** Metadata slot: per-instance effect functions to replay when a class is evolved or lazily registered. @internal */
export declare const DECORATOR_EFFECTS: unique symbol;
/** Metadata slot: teardown callbacks attached to an instance so the outgoing class can unwind before an evolve swap. @internal */
export declare const DECORATOR_TEARDOWNS: unique symbol;
/** Metadata slot: `@Watch` registrations pairing a watched property name with the handler method name. @internal */
export declare const WATCH_HANDLERS: unique symbol;
/** Metadata slot: set of property names declared reactive via `@State`, `@Attribute`, or `@Property` — used to validate `@Watch` targets. @internal */
export declare const REACTIVE_FIELDS: unique symbol;
/** Metadata slot: array of `@Listen` registrations describing event name, target resolver, and options. @internal */
export declare const LISTEN_HANDLERS: unique symbol;
/** Metadata slot: resolved `@Style` output (stylesheet text and encapsulation hints) attached by the style decorator. @internal */
export declare const STYLE_METADATA: unique symbol;
/** Metadata slot: map from observed attribute names to the handlers that sync them into the instance field. @internal */
export declare const ATTR_HANDLERS: unique symbol;
/** Metadata slot: per-field `@Subscribe` registrations that wire a store/observable into a property. @internal */
export declare const SUBSCRIBE_HANDLERS: unique symbol;
/**
 * Register a per-instance effect on a class's metadata.
 *
 * Custom-decorator authors call this to attach work that should run once
 * for each component instance — typically during `connectedCallback`. The
 * Registry replays these effects when a class is evolved or lazily
 * registered, so your decorator keeps working across hot swaps.
 *
 * @param meta - The decorator-context metadata object (`context.metadata`).
 * @param effect - A function that receives the component instance.
 *
 * @example
 * function LogMount(): ClassDecorator {
 *   return (target, context) => {
 *     addDecoratorEffect(context.metadata, (instance) => {
 *       console.log(`${instance.tagName} mounted`);
 *     });
 *   };
 * }
 */
export declare function addDecoratorEffect(meta: Record<symbol, unknown>, effect: DecoratorEffect): void;
/**
 * Register a teardown function for a reactive binding on a component instance.
 *
 * The function runs when the component's class is evolved or lazily
 * replaced — letting the incoming implementation tear down subscriptions,
 * observers, or listeners set up by the previous class before new decorator
 * effects install theirs.
 *
 * Teardowns registered via this helper do NOT automatically run on
 * disconnect. If your decorator installs listeners or subscriptions that
 * must unwind on disconnect, register them in the decorator effect and
 * handle their removal explicitly in that effect's returned cleanup, or
 * through the component's own disconnect path.
 *
 * @param instance - The component instance to attach the teardown to.
 * @param teardown - A function that releases any resources held by the decorator when the class is evolved or replaced.
 *
 * @example
 * function ResizeAware(): ClassDecorator {
 *   return (target, context) => {
 *     addDecoratorEffect(context.metadata, (instance) => {
 *       const observer = new ResizeObserver(() => {});
 *       observer.observe(instance);
 *       // Runs when the class is evolved or lazily replaced, so the
 *       // incoming implementation can install its own observer cleanly.
 *       addTeardown(instance, () => observer.disconnect());
 *     });
 *   };
 * }
 */
export declare function addTeardown(instance: DecoratorInstance, teardown: () => void): void;
/**
 * Make a plain field on a component instance reactive at runtime.
 *
 * This is the imperative escape hatch for `@State`: use it when you cannot
 * reach for decorators (for example, in environments without decorator
 * support, or when wiring up a field from a constructor or custom
 * decorator). The field keeps its current value, but writes now trigger
 * `@Watch` handlers, `didChange`, and an auto-rerender unless you opt out.
 *
 * @param instance - The component instance that owns the field.
 * @param propertyKey - The field name to make reactive.
 * @param options - Optional initial value, change callback, equality check, or `render: false` to skip auto-rerender.
 *
 * @example
 * // A custom field decorator that installs reactivity at runtime, so the
 * // author doesn't have to compose it with @State at every call site.
 * function Counter(initialValue: number = 0): (target: undefined, context: ClassFieldDecoratorContext) => void {
 *   return (_target, context) => {
 *     const propertyKey = String(context.name);
 *     addDecoratorEffect(context.metadata, (instance) => {
 *       reactive(instance, propertyKey, { initialValue });
 *     });
 *   };
 * }
 */
export declare function reactive(instance: DecoratorInstance, propertyKey: string, options?: ReactiveOptions): void;
/**
 * Coerces a raw attribute string into its JavaScript value: `null` becomes
 * `undefined`, the empty string and `"true"` become `true`, `"false"` becomes
 * `false`, numeric strings become numbers, and everything else is passed
 * through as a string. Used when `@Attribute` syncs HTML into a reactive field.
 *
 * @internal
 */
export declare function parseAttributeValue(value: string | null): unknown;
/**
 * Resolves the `target` option of `@Listen` to an actual `EventTarget`. The
 * strings `"window"` and `"document"` map to their globals, `"self"` (or an
 * omitted option) returns the host element, and any other string is treated
 * as a CSS selector. Selectors are routed through the component's own
 * `query()` when provided so they resolve against the host's subtree (light
 * or shadow) rather than the whole document.
 *
 * @internal
 */
export declare function resolveListenerTarget(host: HTMLElement, targetOption?: string, query?: (selector: string) => Element | null): EventTarget | null;
//# sourceMappingURL=Util.d.ts.map