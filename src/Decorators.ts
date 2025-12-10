import Component from './Component';
import Registry from './Registry';

// ==========================================
// Types
// ==========================================

type ComponentConstructor = typeof Component & {
  tag: string;
  _registered?: boolean;
};

// ==========================================
// @Register Decorator
// ==========================================

/**
 * Class Decorator: Automatically registers the component with the CustomElementsRegistry.
 *
 * @example
 * ```typescript
 * @Register('my-component')
 * class MyComponent extends Component {
 *   render() {
 *     return '<div>Hello World</div>';
 *   }
 * }
 * ```
 *
 * @param tagName - The custom element tag name (must contain a hyphen)
 */
export function Register(tagName: string) {
  return function <T extends ComponentConstructor>(constructor: T): T {
    Registry.register(tagName, constructor);
    return constructor;
  };
}

// ==========================================
// @Consumer Decorator
// ==========================================

/**
 * Property Decorator: Binds a class property to a Global Registry state key.
 *
 * This decorator:
 * 1. On component connect, sets the property to the current global value
 * 2. Subscribes to global state changes and updates the property automatically
 * 3. When the property is set internally, updates the global state
 * 4. Automatically unsubscribes when the component disconnects
 *
 * @example
 * ```typescript
 * class UserProfile extends Component {
 *   @Consumer('user.theme')
 *   theme!: string;
 *
 *   @Consumer('app.language')
 *   language!: string;
 *
 *   render() {
 *     return `<div>Theme: ${this.theme}, Language: ${this.language}</div>`;
 *   }
 * }
 * ```
 *
 * @param stateKey - The global state key in the Registry to bind to
 */
export function Consumer(stateKey: string) {
  return function (target: any, propertyKey: string) {
    // Store the original lifecycle methods
    const originalConnected = target.connectedCallback;
    const originalDisconnected = target.disconnectedCallback;

    // Create unique symbols to store per-instance data without collisions
    const unsubKey = Symbol(`__pandora_unsub_${propertyKey}`);
    const valueKey = Symbol(`__pandora_value_${propertyKey}`);

    // Override connectedCallback to set up the subscription
    target.connectedCallback = async function (this: Component & Record<symbol, any>) {
      // Subscribe to Registry state changes
      this[unsubKey] = Registry.subscribe(stateKey, (newVal: unknown) => {
        // Update the property value (this won't trigger Registry.setState due to equality check)
        this[valueKey] = newVal;

        // Trigger a re-render if the component is ready
        if (this._isReady) {
          this.forceRender();
        }
      });

      // Initial sync: Registry -> Component
      const currentGlobal = Registry.getState(stateKey);
      if (currentGlobal !== undefined) {
        this[valueKey] = currentGlobal;
      }

      // Call the original connectedCallback
      if (originalConnected) {
        await originalConnected.call(this);
      }
    };

    // Override disconnectedCallback to clean up the subscription
    target.disconnectedCallback = async function (this: Component & Record<symbol, any>) {
      // Unsubscribe to prevent memory leaks
      if (this[unsubKey]) {
        this[unsubKey]();
        this[unsubKey] = undefined;
      }

      // Call the original disconnectedCallback
      if (originalDisconnected) {
        await originalDisconnected.call(this);
      }
    };

    // Define the property getter/setter on the prototype
    Object.defineProperty(target, propertyKey, {
      get: function (this: Component & Record<symbol, any>) {
        return this[valueKey];
      },
      set: function (this: Component & Record<symbol, any>, newVal: unknown) {
        const oldVal = this[valueKey];

        // Only update if the value actually changed
        if (oldVal === newVal) return;

        this[valueKey] = newVal;

        // Sync to global state (Registry.setState checks equality to prevent loops)
        Registry.setState(stateKey, newVal);

        // Trigger a re-render if the component is ready
        if (this._isReady) {
          this.forceRender();
        }
      },
      enumerable: true,
      configurable: true
    });
  };
}

// ==========================================
// @Prop Decorator (Bonus utility)
// ==========================================

/**
 * Property Decorator: Declares a property that syncs with a DOM attribute.
 *
 * When the attribute changes, the property updates automatically.
 * When the property is set, the attribute is updated.
 *
 * @example
 * ```typescript
 * class MyButton extends Component {
 *   @Prop()
 *   disabled: boolean = false;
 *
 *   @Prop('button-type')
 *   type: string = 'primary';
 * }
 * ```
 *
 * @param attributeName - Optional custom attribute name (defaults to property name)
 */
export function Prop(attributeName?: string) {
  return function (target: any, propertyKey: string) {
    const attrName = attributeName || propertyKey;
    const valueKey = Symbol(`__pandora_prop_${propertyKey}`);

    // Store attribute name for observedAttributes
    if (!target.constructor._observedAttributes) {
      target.constructor._observedAttributes = [];
    }
    if (!target.constructor._observedAttributes.includes(attrName)) {
      target.constructor._observedAttributes.push(attrName);
    }

    Object.defineProperty(target, propertyKey, {
      get: function (this: Component & Record<symbol, any>) {
        // Return the cached value or try to get from attribute
        if (this[valueKey] !== undefined) {
          return this[valueKey];
        }

        // Try to read from attribute
        if (this.hasAttribute(attrName)) {
          const attrValue = this.getAttribute(attrName);
          return parseAttributeValue(attrValue);
        }

        return undefined;
      },
      set: function (this: Component & Record<symbol, any>, newVal: unknown) {
        this[valueKey] = newVal;

        // Reflect to attribute if it's a primitive
        if (typeof newVal === 'string' || typeof newVal === 'number' || typeof newVal === 'boolean') {
          if (typeof newVal === 'boolean') {
            if (newVal) {
              this.setAttribute(attrName, '');
            } else {
              this.removeAttribute(attrName);
            }
          } else {
            this.setAttribute(attrName, String(newVal));
          }
        }
      },
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * Helper function to parse attribute values into appropriate types
 */
function parseAttributeValue(value: string | null): unknown {
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

