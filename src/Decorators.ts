import Component from './Component';
import Registry from './Registry';
import {
  PROP_ATTRIBUTES, WATCH_HANDLERS, LISTEN_HANDLERS, STYLE_METADATA, REACTIVE_FIELDS,
  ATTR_HANDLERS, SUBSCRIBE_HANDLERS,
  addDecoratorEffect, addTeardown, parseAttributeValue,
} from './Util';

import type { AttrHandler, SubscribeHandler } from './Types';
import { Style } from './Types';

// TC39 decorator metadata relies on `Symbol.metadata`; polyfill it for runtimes
// that don't ship the well-known symbol yet so our field decorators can stash
// data on `context.metadata` the same way everywhere.
(Symbol as any).metadata ??= Symbol('Symbol.metadata');

// ==========================================
// Types
// ==========================================

type ComponentConstructor = typeof Component & {
  tag: string;
  _registered?: boolean;
};

type DecoratorInstance = Component & Record<string | symbol, unknown>;

// ==========================================
// @Register
// ==========================================

interface RegisterOptions {
  defer?: boolean;
}

/**
 * Registers a class as a custom element with the browser under the given tag.
 *
 * By default the element is defined on `customElements` immediately. Pass
 * `{ defer: true }` when you want to delay registration — useful if you need
 * to wire up dependencies or control mount ordering yourself before the tag
 * becomes usable in the DOM.
 *
 * @param tagName - The custom element tag name (must contain a hyphen).
 * @param options - Pass `{ defer: true }` to skip automatic registration.
 *
 * @example
 * @Register('my-greeting')
 * class MyGreeting extends Component {
 *   render() {
 *     return html`<p>Hello, world.</p>`;
 *   }
 * }
 *
 * // <my-greeting></my-greeting>
 */
export function Register(tagName: string, options?: RegisterOptions) {
  return function <T extends ComponentConstructor>(constructor: T, context: ClassDecoratorContext): T {
    // At this point the class decorator has run but the TC39 runtime hasn't
    // copied metadata onto the constructor yet, so we read from `context.metadata`
    // directly — that's the only reference that reflects field decorators.
    const meta = context.metadata as Record<symbol, unknown> | undefined;

    if (meta?.[PROP_ATTRIBUTES]) {
      if (!Object.hasOwn(constructor, '_observedAttributes')) {
        (constructor as any)._observedAttributes = [];
      }

      for (const attr of meta[PROP_ATTRIBUTES] as string[]) {
        if (!(constructor as any)._observedAttributes.includes(attr)) {
          (constructor as any)._observedAttributes.push(attr);
        }
      }
    }

    // `customElements.define` reads `observedAttributes`, whose getter falls
    // back to `[Symbol.metadata]` for dynamic cases like inherited `@Attribute`
    // fields — so we need metadata attached to the constructor before we register.
    if (meta && (constructor as unknown as Record<symbol, unknown>)[Symbol.metadata] === undefined) {
      (constructor as unknown as Record<symbol, unknown>)[Symbol.metadata] = meta;
    }

    constructor.tag = tagName;

    if (!options?.defer) {
      Registry.register(tagName, constructor);
    }

    return constructor;
  };
}

// ==========================================
// @Style
// ==========================================

/**
 * Attaches scoped CSS to the component. Accepts either a raw CSS string or
 * a structured `Style` object (selectors and declarations).
 *
 * Styles are applied once per class and live alongside the component's
 * shadow or light DOM output, so they don't leak to the rest of the page.
 *
 * @param css - A CSS string or a `Style` object describing the rules.
 *
 * @example
 * @Register('my-button')
 * @Style({
 *   button: {
 *     padding: '0.5rem 1rem',
 *     borderRadius: '6px',
 *     background: 'hotpink',
 *     color: 'white',
 *   },
 * })
 * class MyButton extends Component {
 *   render() {
 *     return html`<button>Click me</button>`;
 *   }
 * }
 */
export function Style(css: Style | string) {
  return function <T extends ComponentConstructor>(constructor: T, context: ClassDecoratorContext): T {
    const meta = context.metadata as Record<symbol, unknown>;

    meta[STYLE_METADATA] = css;
    return constructor;
  };
}

// ==========================================
// @Watch
// ==========================================

interface WatchEntry {
  property: string;
  methodName: string;
}

/**
 * Runs the decorated method whenever the given reactive property changes,
 * receiving the new and previous values.
 *
 * The watched property must be declared with `@State`, `@Attribute`, or
 * `@Property` — otherwise you'll see a one-time dev warning explaining that
 * the watcher will never fire. Watchers run synchronously on assignment,
 * before the next render is queued.
 *
 * @param property - The name of the reactive field to observe.
 *
 * @example
 * @Register('my-counter')
 * class MyCounter extends Component {
 *   @State() count = 0;
 *
 *   @Watch('count')
 *   onCountChange(next: number, previous: number) {
 *     console.log(`count went from ${previous} to ${next}`);
 *   }
 *
 *   render() {
 *     return html`<button @click=${() => this.count++}>${this.count}</button>`;
 *   }
 * }
 */
export function Watch(property: string) {
  return function <T extends (...args: any[]) => any>(
    _target: T,
    context: ClassMethodDecoratorContext
  ): void {
    const methodName = String(context.name);
    const meta = context.metadata as Record<symbol, unknown>;

    if (!Object.hasOwn(meta, WATCH_HANDLERS)) {
      const inherited = meta[WATCH_HANDLERS] as WatchEntry[] | undefined;
      meta[WATCH_HANDLERS] = inherited ? [...inherited] : [];
    }

    (meta[WATCH_HANDLERS] as WatchEntry[]).push({ property, methodName });

    // Field decorators haven't run yet when the method decorator fires, so we
    // defer the "is this property actually reactive?" check to `addInitializer`
    // — by the time the first instance constructs, every field has registered.
    let warned = false;
    context.addInitializer(function (this: unknown) {
      if (warned) {
        return;
      }

      warned = true;

      const reactiveFields = meta[REACTIVE_FIELDS] as Set<string> | undefined;

      if (!reactiveFields || !reactiveFields.has(property)) {
        const ctorName = (this as { constructor?: { name?: string } })?.constructor?.name ?? '<anonymous>';
        console.warn(
          `[Pandora] @Watch('${property}') on ${ctorName}.${methodName}(): '${property}' has no @State, @Attribute, or @Property decorator. Add one of those decorators to '${property}', or call reactive(this, '${property}') in the constructor — otherwise the watcher will never fire.`
        );
      }
    });
  };
}

/**
 * Collects every `@Watch` callback registered for a given property and binds
 * them to the instance. Called from the reactive setters in `applyStateEffect`
 * and `applyPropEffect` each time a tracked field changes.
 *
 * @internal
 */
function getWatchersForProperty(instance: DecoratorInstance, propertyKey: string): Array<(newVal: unknown, oldVal: unknown) => void> {
  if (typeof Symbol.metadata === 'undefined') {
    return [];
  }

  const meta = ((instance.constructor as any)[Symbol.metadata]) as Record<symbol, unknown> | undefined;
  const entries = meta?.[WATCH_HANDLERS] as WatchEntry[] | undefined;

  if (!entries) {
    return [];
  }

  const callbacks: Array<(newVal: unknown, oldVal: unknown) => void> = [];

  for (const entry of entries) {
    if (entry.property === propertyKey) {
      const method = (instance as any)[entry.methodName];

      if (typeof method === 'function') {
        callbacks.push(method.bind(instance));
      }
    }
  }

  return callbacks;
}

// ==========================================
// Dev Validation
// ==========================================

/**
 * HTMLElement properties that, if shadowed by a decorated field, can cause
 * subtle breakage (e.g. our accessor shadows the native one). Checked at
 * decoration time by `warnIfReserved`.
 *
 * @internal
 */
const RESERVED_ELEMENT_PROPERTIES = new Set([
  'hidden', 'title', 'slot', 'style', 'id', 'className', 'tabIndex',
  'dir', 'lang', 'draggable', 'contentEditable', 'accessKey',
  'innerHTML', 'outerHTML', 'textContent', 'innerText',
]);

/**
 * Emits a dev-time warning if a decorator is applied to a field name that
 * collides with a built-in HTMLElement property. Runs once per decoration.
 *
 * @internal
 */
function warnIfReserved(decoratorName: string, propertyKey: string): void {
  if (RESERVED_ELEMENT_PROPERTIES.has(propertyKey)) {
    console.warn(
      `[Pandora] @${decoratorName}('${propertyKey}') conflicts with HTMLElement.${propertyKey}. ` +
      `This may cause unexpected behavior. Consider renaming to avoid the conflict.`
    );
  }
}

// ==========================================
// @State
// ==========================================

interface StateOptions {
  render?: boolean;
}

/**
 * Declares a reactive instance field. Assigning to the field queues a render
 * on the next microtask, and multiple assignments in the same tick coalesce
 * into a single render pass.
 *
 * Pass `{ render: false }` to keep the field reactive — `@Watch` handlers
 * still fire and the value still flows through `didChange` — without
 * triggering a re-render on every assignment.
 *
 * @param options - Optional `{ render: false }` to opt out of re-rendering.
 *
 * @example
 * @Register('my-counter')
 * class MyCounter extends Component {
 *   @State() count = 0;
 *   @State({ render: false }) private lastPing = Date.now();
 *
 *   render() {
 *     return html`<button @click=${() => this.count++}>${this.count}</button>`;
 *   }
 * }
 */
export function State(options?: StateOptions) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    warnIfReserved('State', propertyKey);
    const shouldRender = options?.render !== false;
    const valueKey = Symbol(`__pandora_state_${propertyKey}`);

    // We capture the class default from the first instance into a closure
    // rather than metadata — the list of known reactive fields lives on the
    // class, but the default value is shared per-decorator-site, so stashing
    // it here keeps metadata from growing per-instance.
    let classDefault: unknown;
    let defaultCaptured = false;

    const meta = context.metadata as Record<symbol, unknown>;

    if (!Object.hasOwn(meta, REACTIVE_FIELDS)) {
      const inherited = meta[REACTIVE_FIELDS] as Set<string> | undefined;
      meta[REACTIVE_FIELDS] = inherited ? new Set(inherited) : new Set();
    }

    (meta[REACTIVE_FIELDS] as Set<string>).add(propertyKey);

    addDecoratorEffect(meta, (instance) => {
      applyStateEffect(instance as DecoratorInstance, propertyKey, valueKey, shouldRender);
      // Evolve/lazy replay runs without the original field initializer, so we
      // seed the backing slot with the captured class default when it's empty.
      if (defaultCaptured && (instance as DecoratorInstance)[valueKey] === undefined) {
        (instance as DecoratorInstance)[valueKey] = classDefault;
      }
    });

    context.addInitializer(function (this: unknown) {
      const instance = this as DecoratorInstance;
      const initialValue = instance[propertyKey as keyof typeof instance];

      applyStateEffect(instance, propertyKey, valueKey, shouldRender);

      if (initialValue !== undefined) {
        instance[valueKey] = initialValue;
        if (!defaultCaptured) {
          classDefault = initialValue;
          defaultCaptured = true;
        }
      }
    });
  };
}

/**
 * Installs a reactive getter/setter pair for a `@State` (or property-only)
 * field on an instance. Called from the state decorator's `addInitializer` on
 * first instantiation and from `Registry.evolve()` / lazy replay when the
 * implementation swaps under a connected element.
 *
 * @internal
 */
function applyStateEffect(
  instance: DecoratorInstance,
  propertyKey: string,
  valueKey: symbol,
  shouldRender: boolean,
  source: string = 'state',
  equals: (a: unknown, b: unknown) => boolean = (a, b) => a === b
): void {
  // Preserve any pre-existing own value before our accessor replaces it. This
  // matters for decorator replay (evolve/lazy) when the caller wrote to the
  // property on the old base instance before the new implementation applied,
  // and for initializers of plain-field defaults.
  migrateOwnValueTo(instance, propertyKey, valueKey);

  Object.defineProperty(instance, propertyKey, {
    get() {
      return instance[valueKey];
    },
    set(newVal: unknown) {
      const oldVal = instance[valueKey];
      if (equals(oldVal, newVal)) return;
      instance[valueKey] = newVal;

      // Inside `batch()` we defer `@Watch` and `didChange` until the batch
      // closes. If the same field changes more than once we collapse entries
      // to a single first-to-last span, keeping the original oldValue.
      if ((instance as any)._batching) {
        const changes = (instance as any)._batchedChanges as Array<{ property: string; oldValue: unknown; newValue: unknown; shouldRender: boolean; source: string }>;
        const existing = changes.find((c: any) => c.property === propertyKey);
        if (existing) {
          existing.newValue = newVal;
          if (shouldRender) existing.shouldRender = true;
        } else {
          changes.push({ property: propertyKey, oldValue: oldVal, newValue: newVal, shouldRender, source });
        }
        return;
      }

      const watchers = getWatchersForProperty(instance, propertyKey);
      for (const watcher of watchers) {
        watcher(newVal, oldVal);
      }

      instance.didChange(propertyKey, oldVal, newVal, source);

      // Skip the render queue until the initial render has landed — otherwise
      // field initializers running during construction would trigger renders
      // before the element is actually ready to paint.
      if (shouldRender && (instance as any)._initRenderDone && instance.isConnected) {
        (instance as any)._queueRender();
      }
    },
    enumerable: true,
    configurable: true
  });

  addTeardown(instance as any, () => {
    delete (instance as any)[propertyKey];
  });
}

// ==========================================
// @Property (reactive, never renders)
// ==========================================

interface PropertyOptions {
  attribute?: string | false;
  equals?: (a: unknown, b: unknown) => boolean;
}

/**
 * Exposes a reactive JavaScript property on the component — ideal for values
 * that aren't string-serializable, like objects, arrays, or class instances.
 *
 * Properties are reactive (they fire `@Watch` handlers and run through
 * `didChange`) but do not trigger re-renders on their own, so a parent can
 * hand a child rich data without causing render thrash. Pass
 * `{ attribute: 'some-name' }` to mirror the value to an attribute for
 * primitives, or provide a custom `equals` comparator to skip updates when
 * a deep-equal object is assigned.
 *
 * @param options - `{ attribute, equals }` to control attribute sync and
 *   change detection.
 *
 * @example
 * interface User { id: string; name: string; }
 *
 * @Register('user-avatar')
 * class UserAvatar extends Component {
 *   @Property() user!: User;
 *
 *   render() {
 *     return html`<img alt=${this.user.name} data-id=${this.user.id}>`;
 *   }
 * }
 *
 * // In a parent:
 * // const el = document.querySelector('user-avatar');
 * // el.user = { id: 'u_42', name: 'Ada Lovelace' };
 */
export function Property(options?: PropertyOptions) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    warnIfReserved('Property', propertyKey);
    const valueKey = Symbol(`__pandora_property_${propertyKey}`);
    const customEquals = options?.equals ?? ((a: unknown, b: unknown) => a === b);
    const attrName = options?.attribute ?? false;

    let classDefault: unknown;
    let defaultCaptured = false;

    const meta = context.metadata as Record<symbol, unknown>;

    if (!Object.hasOwn(meta, REACTIVE_FIELDS)) {
      const inherited = meta[REACTIVE_FIELDS] as Set<string> | undefined;
      meta[REACTIVE_FIELDS] = inherited ? new Set(inherited) : new Set();
    }

    (meta[REACTIVE_FIELDS] as Set<string>).add(propertyKey);

    if (attrName !== false) {
      // Attribute-mirrored path: reuse the attribute machinery but pass
      // `shouldRender = false` so assignments skip the render queue.
      const settingKey = Symbol(`__pandora_propSetting_${propertyKey}`);

      if (!Object.hasOwn(meta, PROP_ATTRIBUTES)) {
        const inherited = meta[PROP_ATTRIBUTES] as string[] | undefined;
        meta[PROP_ATTRIBUTES] = inherited ? [...inherited] : [];
      }

      if (!(meta[PROP_ATTRIBUTES] as string[]).includes(attrName)) {
        (meta[PROP_ATTRIBUTES] as string[]).push(attrName);
      }

      registerAttrHandler(meta, { attrName, propertyKey, valueKey, settingKey, shouldRender: false, equals: customEquals });

      addDecoratorEffect(meta, (instance) => {
        applyPropEffect(instance as DecoratorInstance, attrName, propertyKey, valueKey, settingKey, false, customEquals);
        if (defaultCaptured && (instance as DecoratorInstance)[valueKey] === undefined) {
          if ((instance as DecoratorInstance).hasAttribute(attrName)) {
            (instance as DecoratorInstance)[valueKey] = parseAttributeValue((instance as DecoratorInstance).getAttribute(attrName));
          } else {
            (instance as DecoratorInstance)[valueKey] = classDefault;
            syncToAttribute(instance as DecoratorInstance, attrName, classDefault);
          }
        }
      });

      context.addInitializer(function (this: unknown) {
        const instance = this as DecoratorInstance;
        const initialValue = instance[propertyKey as keyof typeof instance];
        const hasInitialAttribute = instance.hasAttribute(attrName);
        const initialAttributeValue = hasInitialAttribute ? parseAttributeValue(instance.getAttribute(attrName)) : undefined;

        applyPropEffect(instance, attrName, propertyKey, valueKey, settingKey, false, customEquals);

        if (initialValue !== undefined && !defaultCaptured) {
          classDefault = initialValue;
          defaultCaptured = true;
        }

        if (hasInitialAttribute) {
          instance[valueKey] = initialAttributeValue;
        } else if (initialValue !== undefined) {
          instance[valueKey] = initialValue;
          syncToAttribute(instance, attrName, initialValue);
        }
      });
    } else {
      // Default path: reactive field with no attribute mirror and no render,
      // so we ride `applyStateEffect` for `@Watch` plumbing alone.
      addDecoratorEffect(meta, (instance) => {
        applyStateEffect(instance as DecoratorInstance, propertyKey, valueKey, false, 'property', customEquals);

        if (defaultCaptured && (instance as DecoratorInstance)[valueKey] === undefined) {
          (instance as DecoratorInstance)[valueKey] = classDefault;
        }
      });

      context.addInitializer(function (this: unknown) {
        const instance = this as DecoratorInstance;
        const initialValue = instance[propertyKey as keyof typeof instance];

        applyStateEffect(instance, propertyKey, valueKey, false, 'property', customEquals);

        if (initialValue !== undefined) {
          instance[valueKey] = initialValue;
          if (!defaultCaptured) {
            classDefault = initialValue;
            defaultCaptured = true;
          }
        }
      });
    }
  };
}

// ==========================================
// @Attribute
// ==========================================

interface AttributeOptions {
  render?: boolean;
}

/**
 * Binds a reactive field to an HTML attribute. The field reads through to
 * the attribute, and assignments are written back, keeping DOM and JS state
 * in sync.
 *
 * By default the attribute name matches the field name — pass a string to
 * map to a different attribute (e.g. `@Attribute('user-name')`), or pass
 * `{ render: false }` to keep the field reactive without triggering a
 * re-render when the attribute changes. String, number, and boolean values
 * are serialized automatically.
 *
 * @param attributeNameOrOptions - Either the attribute name to bind to, or
 *   an options object like `{ render: false }`.
 *
 * @example
 * @Register('my-greeting')
 * class MyGreeting extends Component {
 *   @Attribute() name = 'world';
 *
 *   render() {
 *     return html`<p>Hello, ${this.name}.</p>`;
 *   }
 * }
 *
 * // <my-greeting name="Ada"></my-greeting>
 */
export function Attribute(attributeNameOrOptions?: string | AttributeOptions) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    warnIfReserved('Attribute', propertyKey);

    let attrName: string;
    let shouldRender = true;

    if (typeof attributeNameOrOptions === 'object') {
      attrName = propertyKey;
      shouldRender = attributeNameOrOptions.render !== false;
    } else {
      attrName = attributeNameOrOptions ?? propertyKey;
    }

    const valueKey = Symbol(`__pandora_attr_${propertyKey}`);
    const meta = context.metadata as Record<symbol, unknown>;

    if (!Object.hasOwn(meta, REACTIVE_FIELDS)) {
      const inherited = meta[REACTIVE_FIELDS] as Set<string> | undefined;
      meta[REACTIVE_FIELDS] = inherited ? new Set(inherited) : new Set();
    }
    (meta[REACTIVE_FIELDS] as Set<string>).add(propertyKey);

    let classDefault: unknown;
    let defaultCaptured = false;

    {
      const settingKey = Symbol(`__pandora_propSetting_${propertyKey}`);

      if (!Object.hasOwn(meta, PROP_ATTRIBUTES)) {
        const inherited = meta[PROP_ATTRIBUTES] as string[] | undefined;
        meta[PROP_ATTRIBUTES] = inherited ? [...inherited] : [];
      }

      if (!(meta[PROP_ATTRIBUTES] as string[]).includes(attrName)) {
        (meta[PROP_ATTRIBUTES] as string[]).push(attrName);
      }

      registerAttrHandler(meta, { attrName, propertyKey, valueKey, settingKey, shouldRender, equals: (a, b) => a === b });

      addDecoratorEffect(meta, (instance) => {
        applyPropEffect(instance as DecoratorInstance, attrName as string, propertyKey, valueKey, settingKey, shouldRender);
        if (defaultCaptured && (instance as DecoratorInstance)[valueKey] === undefined) {
          if ((instance as DecoratorInstance).hasAttribute(attrName as string)) {
            (instance as DecoratorInstance)[valueKey] = parseAttributeValue((instance as DecoratorInstance).getAttribute(attrName as string));
          } else {
            (instance as DecoratorInstance)[valueKey] = classDefault;
            syncToAttribute(instance as DecoratorInstance, attrName as string, classDefault);
          }
        }
      });

      context.addInitializer(function (this: unknown) {
        const instance = this as DecoratorInstance;
        const initialValue = instance[propertyKey as keyof typeof instance];
        const hasInitialAttribute = instance.hasAttribute(attrName);
        const initialAttributeValue = hasInitialAttribute ? parseAttributeValue(instance.getAttribute(attrName)) : undefined;

        applyPropEffect(instance, attrName as string, propertyKey, valueKey, settingKey, shouldRender);

        if (initialValue !== undefined && !defaultCaptured) {
          classDefault = initialValue;
          defaultCaptured = true;
        }

        if (hasInitialAttribute) {
          instance[valueKey] = initialAttributeValue;
        } else if (initialValue !== undefined) {
          instance[valueKey] = initialValue;
          syncToAttribute(instance, attrName as string, initialValue);
        }
      });
    }
  };
}


/**
 * Moves an existing own-data-value out of the property slot and into the
 * backing symbol slot before our accessor descriptor takes over, so a value
 * assigned before decoration survives the install.
 *
 * @internal
 */
function migrateOwnValueTo(instance: DecoratorInstance, propertyKey: string, valueKey: symbol): void {
  const desc = Object.getOwnPropertyDescriptor(instance, propertyKey);
  // A data descriptor means someone wrote a raw value we need to rescue; an
  // accessor descriptor means the reactive getter/setter is already installed,
  // so there's nothing to migrate.
  if (desc && 'value' in desc && desc.value !== undefined && instance[valueKey] === undefined) {
    instance[valueKey] = desc.value;
  }
}

/**
 * Appends an `AttrHandler` to the class-level handler list stored in metadata.
 * Used by `@Attribute` and attribute-mirroring `@Property` during decoration.
 *
 * @internal
 */
function registerAttrHandler(meta: Record<symbol, unknown>, handler: AttrHandler): void {
  if (!Object.hasOwn(meta, ATTR_HANDLERS)) {
    const inherited = meta[ATTR_HANDLERS] as AttrHandler[] | undefined;
    meta[ATTR_HANDLERS] = inherited ? [...inherited] : [];
  }

  (meta[ATTR_HANDLERS] as AttrHandler[]).push(handler);
}

/**
 * Writes a primitive value back to an element attribute, serializing booleans
 * as presence/absence and strings/numbers via `String()`. Other types are
 * skipped — they can't round-trip through the DOM.
 *
 * @internal
 */
function syncToAttribute(instance: DecoratorInstance, attrName: string, value: unknown): void {
  if (typeof value === 'boolean') {
    if (value) {
      instance.setAttribute(attrName, '');
    } else {
      instance.removeAttribute(attrName);
    }
  } else if (typeof value === 'string' || typeof value === 'number') {
    instance.setAttribute(attrName, String(value));
  }
}

/**
 * Installs a reactive accessor that mirrors its value to an HTML attribute,
 * used by `@Attribute` and attribute-synced `@Property`. Called on first
 * instantiation and again on evolve/lazy replay.
 *
 * @internal
 */
function applyPropEffect(
  instance: DecoratorInstance,
  attrName: string,
  propertyKey: string,
  valueKey: symbol,
  settingKey: symbol,
  shouldRender: boolean = true,
  equals: (a: unknown, b: unknown) => boolean = (a, b) => a === b
): void {
  migrateOwnValueTo(instance, propertyKey, valueKey);

  Object.defineProperty(instance, propertyKey, {
    get() {
      if (instance[valueKey] !== undefined) {
        return instance[valueKey];
      }

      if (instance.hasAttribute(attrName)) {
        return parseAttributeValue(instance.getAttribute(attrName));
      }

      return undefined;
    },
    set(newVal: unknown) {
      const oldVal = instance[valueKey];
      instance[valueKey] = newVal;
      instance[settingKey] = true;

      // `undefined` / `null` clears the attribute; primitives serialize with
      // boolean-as-presence semantics, matching how HTML natively treats them.
      if (newVal === undefined || newVal === null) {
        instance.removeAttribute(attrName);
      } else if (typeof newVal === 'string' || typeof newVal === 'number' || typeof newVal === 'boolean') {
        if (typeof newVal === 'boolean') {
          if (newVal) {
            instance.setAttribute(attrName, '');
          } else {
            instance.removeAttribute(attrName);
          }
        } else {
          instance.setAttribute(attrName, String(newVal));
        }
      }

      instance[settingKey] = false;

      if (!equals(oldVal, newVal)) {
        // Same batching dance as `applyStateEffect`: coalesce repeated writes
        // to a single first-to-last record while a batch is open.
        if ((instance as any)._batching) {
          const changes = (instance as any)._batchedChanges as Array<{ property: string; oldValue: unknown; newValue: unknown; shouldRender: boolean; source: string }>;
          const existing = changes.find((c: any) => c.property === propertyKey);

          if (existing) {
            existing.newValue = newVal;

            if (shouldRender) {
              existing.shouldRender = true;
            }
          } else {
            changes.push({ property: propertyKey, oldValue: oldVal, newValue: newVal, shouldRender, source: 'prop' });
          }
        } else {
          const watchers = getWatchersForProperty(instance, propertyKey);

          for (const watcher of watchers) {
            watcher(newVal, oldVal);
          }

          instance.didChange(propertyKey, oldVal, newVal, 'prop');

          if (shouldRender && (instance as any)._initRenderDone && instance.isConnected) {
            (instance as any)._queueRender();
          }
        }
      }
    },
    enumerable: true,
    configurable: true
  });

  if (instance.isConnected && instance.hasAttribute(attrName)) {
    instance[valueKey] = parseAttributeValue(instance.getAttribute(attrName));
  }

  addTeardown(instance as any, () => {
    delete (instance as any)[propertyKey];
  });
}

// ==========================================
// @Subscribe
// ==========================================

/**
 * Subscribes a field to a shared state key on the global `Registry`. Reading
 * the field returns the current registry value; assigning writes it back
 * and notifies every other subscriber.
 *
 * Subscriptions activate on connect and tear down on disconnect, so
 * components automatically stay in sync with the store for as long as
 * they're in the DOM — no manual wiring required.
 *
 * @param stateKey - The key in the `Registry` store this field mirrors.
 *
 * @example
 * // Somewhere at startup:
 * Registry.setState('theme', 'light');
 *
 * @Register('theme-toggle')
 * class ThemeToggle extends Component {
 *   @Subscribe('theme') theme!: 'light' | 'dark';
 *
 *   render() {
 *     return html`
 *       <button @click=${() => this.theme = this.theme === 'light' ? 'dark' : 'light'}>
 *         Theme: ${this.theme}
 *       </button>
 *     `;
 *   }
 * }
 */
export function Subscribe(stateKey: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    const unsubKey = Symbol(`__pandora_unsub_${propertyKey}`);
    const valueKey = Symbol(`__pandora_value_${propertyKey}`);

    const meta = context.metadata as Record<symbol, unknown>;

    if (!Object.hasOwn(meta, REACTIVE_FIELDS)) {
      const inherited = meta[REACTIVE_FIELDS] as Set<string> | undefined;
      meta[REACTIVE_FIELDS] = inherited ? new Set(inherited) : new Set();
    }

    (meta[REACTIVE_FIELDS] as Set<string>).add(propertyKey);

    // We stash subscription handlers on class metadata so the prototype's
    // `connectedCallback` can activate them on mount. The browser invokes
    // lifecycle callbacks through the prototype, so per-instance wrappers
    // registered via `addInitializer` would never fire on a natural mount.
    if (!Object.hasOwn(meta, SUBSCRIBE_HANDLERS)) {
      const inherited = meta[SUBSCRIBE_HANDLERS] as SubscribeHandler[] | undefined;
      meta[SUBSCRIBE_HANDLERS] = inherited ? [...inherited] : [];
    }

    (meta[SUBSCRIBE_HANDLERS] as SubscribeHandler[]).push({ stateKey, propertyKey, unsubKey, valueKey });

    addDecoratorEffect(meta, (instance) => {
      applyConsumerEffect(instance as DecoratorInstance, stateKey, propertyKey, unsubKey, valueKey);
    });

    context.addInitializer(function (this: unknown) {
      applyConsumerEffect(this as DecoratorInstance, stateKey, propertyKey, unsubKey, valueKey);
    });
  };
}


/**
 * Installs a reactive accessor backed by the global `Registry` for
 * `@Subscribe` fields, wiring reads, writes, and subscription lifecycle on
 * the instance. Called on decoration and again on evolve/lazy replay.
 *
 * @internal
 */
function applyConsumerEffect(
  instance: DecoratorInstance,
  stateKey: string,
  propertyKey: string,
  unsubKey: symbol,
  valueKey: symbol
): void {
  Object.defineProperty(instance, propertyKey, {
    get() {
      return instance[valueKey];
    },
    set(newVal: unknown) {
      const oldVal = instance[valueKey];

      if (oldVal === newVal) {
        return;
      }

      instance[valueKey] = newVal;
      Registry.setState(stateKey, newVal);
      instance.didChange(propertyKey, oldVal, newVal, 'consumer');

      if (instance.isReady) {
        (instance as any)._queueRender();
      }
    },
    enumerable: true,
    configurable: true
  });

  // When evolve/lazy re-applies on an already-connected instance, we activate
  // the subscription right here — otherwise we'd miss every state update
  // until the next connect cycle. The prototype `connectedCallback` handles
  // the natural mount path.
  if (instance.isConnected) {
    Component._activateSubscription?.(instance as unknown as Component, { stateKey, propertyKey, unsubKey, valueKey });
  }

  addTeardown(instance as any, () => {
    if (instance[unsubKey]) {
      (instance[unsubKey] as () => void)();
      instance[unsubKey] = undefined;
    }
    delete (instance as any)[propertyKey];
  });
}

// ==========================================
// @Query / @QueryAll
// ==========================================

/**
 * Turns a field into a live selector query against the component's rendered
 * DOM. Each access re-runs the lookup, so the reference stays correct even
 * as the template re-renders.
 *
 * @param selector - A CSS selector scoped to the component's root.
 *
 * @example
 * @Register('my-form')
 * class MyForm extends Component {
 *   @Query('input[name="email"]') emailInput!: HTMLInputElement | null;
 *
 *   submit() {
 *     console.log('email:', this.emailInput?.value);
 *   }
 *
 *   render() {
 *     return html`
 *       <form @submit=${(e: Event) => { e.preventDefault(); this.submit(); }}>
 *         <input name="email" type="email" />
 *         <button type="submit">Send</button>
 *       </form>
 *     `;
 *   }
 * }
 */
export function Query(selector: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);

    const meta = context.metadata as Record<symbol, unknown>;

    addDecoratorEffect(meta, (instance) => {
      applyQueryEffect(instance as unknown as Component, propertyKey, selector);
    });

    context.addInitializer(function (this: unknown) {
      applyQueryEffect(this as Component, propertyKey, selector);
    });
  };
}

/**
 * Like `@Query`, but returns every matching element. Each access re-runs
 * the lookup, so the list reflects the current DOM on every read.
 *
 * @param selector - A CSS selector scoped to the component's root.
 *
 * @example
 * @Register('my-tabs')
 * class MyTabs extends Component {
 *   @QueryAll('li') items!: NodeListOf<HTMLLIElement>;
 *
 *   logItems() {
 *     for (const item of this.items) console.log(item.textContent);
 *   }
 *
 *   render() {
 *     return html`
 *       <ul>
 *         <li>Overview</li>
 *         <li>Activity</li>
 *         <li>Settings</li>
 *       </ul>
 *     `;
 *   }
 * }
 */
export function QueryAll(selector: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);

    const meta = context.metadata as Record<symbol, unknown>;

    addDecoratorEffect(meta, (instance) => {
      applyQueryAllEffect(instance as unknown as Component, propertyKey, selector);
    });

    context.addInitializer(function (this: unknown) {
      applyQueryAllEffect(this as Component, propertyKey, selector);
    });
  };
}

/**
 * Installs a live `query(selector)` getter on an instance for a `@Query`
 * field, so each read reflects the current rendered DOM.
 *
 * @internal
 */
function applyQueryEffect(instance: Component, propertyKey: string, selector: string): void {
  Object.defineProperty(instance, propertyKey, {
    get() {
      return instance.query(selector);
    },
    enumerable: true,
    configurable: true
  });
}

/**
 * Installs a live `queryAll(selector)` getter on an instance for a
 * `@QueryAll` field.
 *
 * @internal
 */
function applyQueryAllEffect(instance: Component, propertyKey: string, selector: string): void {
  Object.defineProperty(instance, propertyKey, {
    get() {
      return instance.queryAll(selector);
    },
    enumerable: true,
    configurable: true
  });
}

// ==========================================
// @Slot
// ==========================================

/**
 * Exposes a `<slot>` element from the shadow root as a field, so you can
 * inspect projected children or call slot APIs like `assignedElements()`.
 *
 * Call with no argument to grab the default slot, or pass a name for a
 * named slot.
 *
 * @param name - Optional named slot to target; omit for the default slot.
 *
 * @example
 * @Register('my-card')
 * class MyCard extends ShadowComponent {
 *   @Slot('header') headerSlot!: HTMLSlotElement | null;
 *
 *   connectedCallback() {
 *     super.connectedCallback();
 *     console.log('header children:', this.headerSlot?.assignedElements());
 *   }
 *
 *   render() {
 *     return html`
 *       <section>
 *         <header><slot name="header"></slot></header>
 *         <slot></slot>
 *       </section>
 *     `;
 *   }
 * }
 */
export function Slot(name?: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);
    const slotSelector = name ? `slot[name="${name}"]` : 'slot:not([name])';

    const meta = context.metadata as Record<symbol, unknown>;

    addDecoratorEffect(meta, (instance) => {
      applySlotEffect(instance as unknown as Component, propertyKey, slotSelector);
    });

    context.addInitializer(function (this: unknown) {
      applySlotEffect(this as Component, propertyKey, slotSelector);
    });
  };
}

/**
 * Installs a getter that resolves to the requested `<slot>` element inside
 * the component's shadow root for a `@Slot` field.
 *
 * @internal
 */
function applySlotEffect(instance: Component, propertyKey: string, slotSelector: string): void {
  Object.defineProperty(instance, propertyKey, {
    get() {
      const shadowRoot = (instance as any)._shadowDOM || (instance as any).shadowRoot;
      return shadowRoot?.querySelector(slotSelector) ?? null;
    },
    enumerable: true,
    configurable: true
  });
}

// ==========================================
// @Listen
// ==========================================

interface ListenOptions {
  target?: 'self' | 'window' | 'document' | string;
  delegate?: string;
  capture?: boolean;
  passive?: boolean;
  once?: boolean;
}

/**
 * Binds a method as an event listener. By default the listener attaches to
 * the component itself, and is added on connect and removed on disconnect.
 *
 * Pass `target` to listen on `'window'`, `'document'`, or any CSS selector
 * scoped to the component's own subtree; pass `delegate` to catch events that
 * bubble up from a child matching a selector; `capture`, `passive`, and `once`
 * forward to the underlying `addEventListener` call.
 *
 * @param event - The event name to listen for (e.g. `'click'`, `'keydown'`).
 * @param options - Optional `{ target, delegate, capture, passive, once }`.
 *
 * @example
 * @Register('my-button')
 * class MyButton extends Component {
 *   @State() pressed = 0;
 *
 *   @Listen('click')
 *   handleClick(event: MouseEvent) {
 *     this.pressed++;
 *   }
 *
 *   render() {
 *     return html`<button>Pressed ${this.pressed} times</button>`;
 *   }
 * }
 */
export function Listen(event: string, options?: ListenOptions) {
  return function <T extends (...args: any[]) => any>(
    _target: T,
    context: ClassMethodDecoratorContext
  ): void {
    const methodName = String(context.name);
    const meta = context.metadata as Record<symbol, unknown>;

    if (!Object.hasOwn(meta, LISTEN_HANDLERS)) {
      const inherited = meta[LISTEN_HANDLERS] as unknown[] | undefined;
      meta[LISTEN_HANDLERS] = inherited ? [...inherited] : [];
    }

    (meta[LISTEN_HANDLERS] as unknown[]).push({
      event,
      methodName,
      options
    });
  };
}

// ==========================================
// @Computed
// ==========================================

/**
 * Turns a getter into a cached derived value. The result is computed once,
 * reused on every read, and invalidated automatically whenever any of the
 * listed reactive dependencies change.
 *
 * List every `@State`, `@Attribute`, or `@Property` the getter reads — those
 * names drive cache invalidation, so anything missing will leave you with a
 * stale result.
 *
 * @param dependencies - Names of reactive fields the getter depends on.
 *
 * @example
 * @Register('cart-summary')
 * class CartSummary extends Component {
 *   @State() price = 10;
 *   @State() quantity = 3;
 *
 *   @Computed('price', 'quantity')
 *   get total() {
 *     return this.price * this.quantity;
 *   }
 *
 *   render() {
 *     return html`<p>Total: $${this.total}</p>`;
 *   }
 * }
 */
export function Computed(...dependencies: string[]) {
  return function <T>(
    _target: T,
    context: ClassGetterDecoratorContext
  ): T {
    const propertyKey = String(context.name);
    const cacheKey = Symbol(`__pandora_computed_cache_${propertyKey}`);
    const validKey = Symbol(`__pandora_computed_valid_${propertyKey}`);

    const meta = context.metadata as Record<symbol, unknown>;

    // We piggy-back on `@Watch`: each dependency gets a watcher that calls
    // the per-instance invalidation method, so cache flushing rides the same
    // change-propagation path as user-written watchers.
    for (const dep of dependencies) {
      if (!Object.hasOwn(meta, WATCH_HANDLERS)) {
        const inherited = meta[WATCH_HANDLERS] as WatchEntry[] | undefined;
        meta[WATCH_HANDLERS] = inherited ? [...inherited] : [];
      }

      (meta[WATCH_HANDLERS] as WatchEntry[]).push({
        property: dep,
        methodName: `__invalidate_${propertyKey}`
      });
    }

    // Snapshot the getter at decoration time. During evolve/lazy replay the
    // old prototype's getter is long gone, so we need a direct reference to
    // the getter the source class declared here.
    const originalGetter = _target as unknown as () => unknown;

    addDecoratorEffect(meta, (instance) => {
      applyComputedEffect(instance as DecoratorInstance, propertyKey, cacheKey, validKey, originalGetter);
    });

    context.addInitializer(function (this: unknown) {
      applyComputedEffect(this as DecoratorInstance, propertyKey, cacheKey, validKey, originalGetter);
    });

    return _target;
  };
}

/**
 * Installs the caching getter and `__invalidate_*` companion method for a
 * `@Computed` field on an instance. Runs once per instance and again on
 * evolve/lazy replay so the cache clears on swap.
 *
 * @internal
 */
function applyComputedEffect(
  instance: DecoratorInstance,
  propertyKey: string,
  cacheKey: symbol,
  validKey: symbol,
  originalGetter: () => unknown
): void {
  // `@Watch` entries for each dependency call into this invalidator; flipping
  // the validity flag lets the next read recompute on demand.
  (instance as any)[`__invalidate_${propertyKey}`] = () => {
    instance[validKey] = false;
  };

  Object.defineProperty(instance, propertyKey, {
    get() {
      if (!instance[validKey]) {
        instance[cacheKey] = originalGetter.call(instance);
        instance[validKey] = true;
      }

      return instance[cacheKey];
    },
    enumerable: true,
    configurable: true
  });
}

// ==========================================
// @ClassList
// ==========================================

type ClassListMap = Record<string, string | ((instance: any) => boolean)>;

/**
 * Declaratively toggles classes on the host element based on reactive state.
 * Map a class name to a reactive field name (truthy → class on, falsy →
 * class off) or to a predicate function that receives the instance and
 * returns a boolean.
 *
 * Classes are applied on connect and updated whenever the underlying
 * reactive fields change, so you never have to reach into `classList`
 * by hand.
 *
 * @param map - Object mapping class names to reactive fields or predicates.
 *
 * @example
 * @Register('my-toggle')
 * @ClassList({
 *   'is-active': 'active',
 *   'is-empty': (self: MyToggle) => self.label.length === 0,
 * })
 * class MyToggle extends Component {
 *   @State() active = false;
 *   @Attribute() label = '';
 *
 *   render() {
 *     return html`
 *       <button @click=${() => this.active = !this.active}>${this.label}</button>
 *     `;
 *   }
 * }
 */
export function ClassList(map: ClassListMap) {
  return function <T extends ComponentConstructor>(constructor: T, _context: ClassDecoratorContext): T {
    const meta = _context.metadata as Record<symbol, unknown>;

    const propertyMappings: Array<{ className: string; propertyName: string }> = [];
    const functionMappings: Array<{ className: string; conditionFn: (instance: any) => boolean }> = [];

    for (const [className, condition] of Object.entries(map)) {
      if (typeof condition === 'string') {
        propertyMappings.push({ className, propertyName: condition });

        // String conditions ride on `@Watch`: each field gets a synthetic
        // watcher whose generated method name re-toggles the class from the
        // current value, keeping classList in sync per-field with no diffing.
        if (!Object.hasOwn(meta, WATCH_HANDLERS)) {
          const inherited = meta[WATCH_HANDLERS] as WatchEntry[] | undefined;
          meta[WATCH_HANDLERS] = inherited ? [...inherited] : [];
        }
        const methodName = `__classlist_${className}_${condition}`;
        (meta[WATCH_HANDLERS] as WatchEntry[]).push({ property: condition, methodName });

        (constructor.prototype as any)[methodName] = function (this: Component) {
          this.classList.toggle(className, !!(this as any)[condition]);
        };
      } else {
        functionMappings.push({ className, conditionFn: condition });
      }
    }

    // Predicate conditions can read from anywhere, so we hook `didChange` on
    // the prototype — any reactive update re-evaluates every predicate. Less
    // precise than per-field watchers, but it's the only way to catch
    // dependencies we can't statically enumerate.
    if (functionMappings.length > 0) {
      const originalDidChange = constructor.prototype.didChange;
      constructor.prototype.didChange = function (this: Component, prop: string, oldVal: unknown, newVal: unknown, source?: string) {
        originalDidChange?.call(this, prop, oldVal, newVal, source);

        for (const { className, conditionFn } of functionMappings) {
          this.classList.toggle(className, conditionFn(this));
        }
      };
    }

    const originalConnected = constructor.prototype.connectedCallback;
    constructor.prototype.connectedCallback = async function (this: Component) {
      await originalConnected?.call(this);

      for (const { className, propertyName } of propertyMappings) {
        this.classList.toggle(className, !!(this as any)[propertyName]);
      }

      for (const { className, conditionFn } of functionMappings) {
        this.classList.toggle(className, conditionFn(this));
      }
    };

    return constructor;
  };
}

// ==========================================
// @Emitter
// ==========================================

/**
 * Installs a function on the component that dispatches a bubbling custom
 * event with the given name. Call the field like a method, passing any
 * payload you want to hand up to parents through `event.detail`.
 *
 * The event bubbles and is composed, so parent components and listeners
 * outside a shadow root can subscribe with a plain `addEventListener`.
 *
 * @param eventName - The custom event name to dispatch.
 *
 * @example
 * @Register('my-button')
 * class MyButton extends Component {
 *   @Emitter('button-pressed') pressed!: (detail?: { at: number }) => void;
 *
 *   @Listen('click')
 *   onClick() {
 *     this.pressed({ at: Date.now() });
 *   }
 *
 *   render() {
 *     return html`<button>Press me</button>`;
 *   }
 * }
 *
 * // In a parent:
 * // el.addEventListener('button-pressed', (e) => console.log(e.detail.at));
 */
export function Emitter(eventName: string) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const propertyKey = String(context.name);

    const meta = context.metadata as Record<symbol, unknown>;

    addDecoratorEffect(meta, (instance) => {
      applyEmitterEffect(instance as unknown as Component, propertyKey, eventName);
    });

    context.addInitializer(function (this: unknown) {
      applyEmitterEffect(this as Component, propertyKey, eventName);
    });
  };
}

/**
 * Installs the dispatching function on an instance for an `@Emitter` field.
 * The value is non-writable so user code can't accidentally clobber the
 * emitter with a plain assignment.
 *
 * @internal
 */
function applyEmitterEffect(instance: Component, propertyKey: string, eventName: string): void {
  Object.defineProperty(instance, propertyKey, {
    value: (detail?: unknown) => {
      return instance.emit(eventName, detail);
    },
    writable: false,
    enumerable: true,
    configurable: true
  });
}
