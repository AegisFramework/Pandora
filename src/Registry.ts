import Component from './Component';

type ComponentClass = typeof Component & {
  tag: string;
  _registered?: boolean;
};

/**
 * Registry for managing web components
 */
class Registry {
  private static components: Record<string, ComponentClass> = {};

  /**
   * Register a new component with a specific tag name
   * @param tag - The tag name for the component
   * @param component - The component constructor
   */
  static register(tag: string, component: ComponentClass): void {
    if (typeof this.components[tag] === 'undefined') {
      this.components[tag] = component;

      const components = this.components;
      window.customElements.define(tag, new Proxy(Component, {
        getPrototypeOf(target) {
          return Reflect.getPrototypeOf(target);
        },
        getOwnPropertyDescriptor(target, propertyKey) {
          return Reflect.getOwnPropertyDescriptor(components[tag], propertyKey);
        },
        construct(target, args) {
          return document.createElement(components[tag].tag);
        },
        get(target, property, receiver) {
          return Reflect.get(components[tag], property, receiver);
        },
        set(target, property, value, receiver) {
          return Reflect.set(components[tag], property, value, receiver);
        },
        apply(target, receiver, args) {
          return Reflect.apply(components[tag] as unknown as (...args: any[]) => any, receiver, args);
        }
      }));
      this.components[tag]._registered = true;
    } else {
      throw new Error('A component with this tag has already been registered. Use the evolve() function to modify the component.');
    }
  }

  /**
   * Update an existing component with a new implementation
   * @param tag - The tag name of the component to update
   * @param component - The new component constructor
   */
  static evolve(tag: string, component: ComponentClass): void {
    if (typeof this.components[tag] === 'undefined') {
      throw new Error('No component with this tag has been registered. Cannot Evolve.');
    } else {
      const previousState = { ...(this.components[tag] as any).state };
      const previousProps = { ...(this.components[tag] as any).props };

      this.components[tag] = component;
      this.components[tag]._registered = true;
    }
  }

  /**
   * Get all instances of a component or execute a callback on them
   * @param tag - The tag name of the component
   * @param callback - Optional callback to execute on each instance
   */
  static instances(tag: string, callback?: (instance: Element) => void): NodeListOf<Element> | void {
    if (typeof this.components[tag] !== 'undefined') {
      if (typeof callback === 'function') {
        document.querySelectorAll(tag).forEach(callback);
      } else {
        return document.querySelectorAll(tag);
      }
    } else {
      throw new Error('No component with the provided tag has been registered.');
    }
  }

  /**
   * Create a new instance of a component
   * @param tag - The tag name of the component
   * @param props - Properties to set on the component
   */
  static instantiate(tag: string, props: Record<string, any>): Component {
    if (!this.components[tag]._registered) {
      this.register(tag, this.components[tag]);
    }

    const element = document.createElement(this.components[tag].tag) as Component;
    (element as any)._setProps(props);

    return element;
  }
}

export default Registry;