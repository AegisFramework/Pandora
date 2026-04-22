import { TemplateResult } from 'lit-html';
import { CSSObject, DecoratorInstance, DecoratorEffect, ReactiveOptions } from './Types';

/**
 * Invokes a callback and always returns a Promise, regardless of whether the
 * callback itself is sync or async. Lets hooks that may or may not be
 * declared `async` be awaited uniformly without branching at each call site.
 *
 * @internal
 */
export function callAsync<T>(callable: (...args: any[]) => T, context: any, ...args: any[]): Promise<T> {
  try {
    const result = callable.apply(context, args);
    return result instanceof Promise ? result : Promise.resolve(result);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Duck-types a value as a lit-html `TemplateResult` by looking for its
 * `_$litType$` brand. We avoid `instanceof` so the check survives across
 * realms and when multiple lit-html copies coexist in the same page.
 *
 * @internal
 */
export function isTemplateResult(value: unknown): value is TemplateResult {
  return (value !== null && typeof value === 'object' && '_$litType$' in (value as object));
}

/**
 * Flattens a nested `CSSObject` into a CSS string for injection at render
 * time. When `encapsulation` is a tag selector (light-DOM mode), selectors
 * are scoped under it — `:host` maps to the tag, `&`-prefixed rules nest
 * inline, at-rules pass through untouched, and everything else is prefixed.
 *
 * @internal
 */
export function deserializeCSS(object: CSSObject, encapsulation: string = '', level: number = 0): string {
  const keys = Object.keys(object);
  let css = '';

  for (const key of keys) {
    const value = object[key];

    if (typeof value === 'object' && value !== null) {
      if (encapsulation && !key.startsWith('@')) {
        if (key.startsWith('&')) {
          css += `${key.replace(/&/g, encapsulation)} {\n`;
        } else if (key === ':host') {
          // In light DOM there is no shadow root, so `:host` is rewritten to
          // the component's tag selector to preserve the same targeting.
          css += `${encapsulation} {\n`;
        } else {
          css += `${encapsulation} ${key} {\n`;
        }
      } else {
        css += `${key} {\n`;
      }

      const properties = Object.keys(value);
      for (const property of properties) {
        css += '\t'.repeat(level);
        const propValue = value[property];

        if (typeof propValue === 'object' && propValue !== null) {
          const temp: CSSObject = {};
          temp[property] = propValue;
          css += deserializeCSS(temp, encapsulation, level + 1);
        } else {
          css += `\t${property}: ${propValue};\n`;
        }
      }
      css += '}\n';
    } else {
      css += '\t'.repeat(level);
      css += `\t${key}: ${value};\n`;
    }
  }

  return css;
}

/** Metadata slot: array of attribute names that `@Attribute` wants observed on the element. @internal */
export const PROP_ATTRIBUTES: unique symbol = Symbol('pandora:propAttributes');

/** Metadata slot: per-instance effect functions to replay when a class is evolved or lazily registered. @internal */
export const DECORATOR_EFFECTS: unique symbol = Symbol('pandora:decoratorEffects');

/** Metadata slot: teardown callbacks attached to an instance so the outgoing class can unwind before an evolve swap. @internal */
export const DECORATOR_TEARDOWNS: unique symbol = Symbol('pandora:decoratorTeardowns');

/** Metadata slot: `@Watch` registrations pairing a watched property name with the handler method name. @internal */
export const WATCH_HANDLERS: unique symbol = Symbol('pandora:watchHandlers');

/** Metadata slot: set of property names declared reactive via `@State`, `@Attribute`, or `@Property` — used to validate `@Watch` targets. @internal */
export const REACTIVE_FIELDS: unique symbol = Symbol('pandora:reactiveFields');

/** Metadata slot: array of `@Listen` registrations describing event name, target resolver, and options. @internal */
export const LISTEN_HANDLERS: unique symbol = Symbol('pandora:listenHandlers');

/** Metadata slot: resolved `@Style` output (stylesheet text and encapsulation hints) attached by the style decorator. @internal */
export const STYLE_METADATA: unique symbol = Symbol('pandora:styleMetadata');

/** Metadata slot: map from observed attribute names to the handlers that sync them into the instance field. @internal */
export const ATTR_HANDLERS: unique symbol = Symbol('pandora:attrHandlers');

/** Metadata slot: per-field `@Subscribe` registrations that wire a store/observable into a property. @internal */
export const SUBSCRIBE_HANDLERS: unique symbol = Symbol('pandora:subscribeHandlers');

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
export function addDecoratorEffect(meta: Record<symbol, unknown>, effect: DecoratorEffect): void {
  if (!Object.hasOwn(meta, DECORATOR_EFFECTS)) {
    const inherited = meta[DECORATOR_EFFECTS] as DecoratorEffect[] | undefined;
    meta[DECORATOR_EFFECTS] = inherited ? [...inherited] : [];
  }

  (meta[DECORATOR_EFFECTS] as DecoratorEffect[]).push(effect);
}

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
export function addTeardown(instance: DecoratorInstance, teardown: () => void): void {
  if (!instance[DECORATOR_TEARDOWNS]) {
    instance[DECORATOR_TEARDOWNS] = [];
  }
  (instance[DECORATOR_TEARDOWNS] as (() => void)[]).push(teardown);
}

// Stable symbol registry for `reactive()`. Repeat calls on the same property
// name must reuse the same hidden slot — otherwise reconnecting a field (for
// example, after an evolve) would orphan the previous value behind a fresh
// symbol and the getter would read `undefined`.
const reactiveKeys = new Map<string, symbol>();

/**
 * Returns the hidden-slot symbol used to back a reactive field named
 * `propertyKey`, creating it on first use. The symbol is shared across all
 * instances so `reactive()` can be called more than once for the same
 * property without losing its stored value.
 *
 * @internal
 */
function getReactiveKey(propertyKey: string): symbol {
  let key = reactiveKeys.get(propertyKey);
  if (!key) {
    key = Symbol(`__pandora_reactive_${propertyKey}`);
    reactiveKeys.set(propertyKey, key);
  }
  return key;
}

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
export function reactive(
  instance: DecoratorInstance,
  propertyKey: string,
  options: ReactiveOptions = {}
): void {
  const valueKey = getReactiveKey(propertyKey);
  const equals = options.equals ?? ((a: unknown, b: unknown) => a === b);

  // Safe on repeat calls: if the slot already holds a value (e.g. reconnection after evolve) we leave the user's last write in place.
  if (options.initialValue !== undefined && instance[valueKey] === undefined) {
    instance[valueKey] = options.initialValue;
  }

  Object.defineProperty(instance, propertyKey, {
    get() {
      return instance[valueKey];
    },
    set(newVal: unknown) {
      const oldVal = instance[valueKey];
      if (equals(oldVal, newVal)) return;
      instance[valueKey] = newVal;

      if (options.onChange) {
        options.onChange(newVal, oldVal);
      }

      if (typeof Symbol.metadata !== 'undefined') {
        const meta = ((instance.constructor as any)[Symbol.metadata]) as Record<symbol, unknown> | undefined;
        const entries = meta?.[WATCH_HANDLERS] as Array<{ property: string; methodName: string }> | undefined;
        if (entries) {
          for (const entry of entries) {
            if (entry.property === propertyKey) {
              const method = (instance as any)[entry.methodName];
              if (typeof method === 'function') {
                method.call(instance, newVal, oldVal);
              }
            }
          }
        }
      }

      if (typeof (instance as any).didChange === 'function') {
        (instance as any).didChange(propertyKey, oldVal, newVal, 'reactive');
      }

      if (options.render !== false && typeof (instance as any)._queueRender === 'function') {
        (instance as any)._queueRender();
      }
    },
    enumerable: true,
    configurable: true
  });
}

/**
 * Coerces a raw attribute string into its JavaScript value: `null` becomes
 * `undefined`, the empty string and `"true"` become `true`, `"false"` becomes
 * `false`, numeric strings become numbers, and everything else is passed
 * through as a string. Used when `@Attribute` syncs HTML into a reactive field.
 *
 * @internal
 */
export function parseAttributeValue(value: string | null): unknown {
  if (value === null) {
    return undefined;
  }

  if (value === '' || value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  if (!isNaN(Number(value))) {
    return value.includes('.') ? parseFloat(value) : parseInt(value, 10);
  }
  return value;
}

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
export function resolveListenerTarget(
  host: HTMLElement,
  targetOption?: string,
  query?: (selector: string) => Element | null
): EventTarget | null {
  if (targetOption === 'window') {
    return window;
  }

  if (targetOption === 'document') {
    return document;
  }

  if (targetOption && targetOption !== 'self') {
    return query ? query(targetOption) : host.querySelector(targetOption);
  }

  return host;
}
