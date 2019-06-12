import { Component } from './Component';

export class Registry {

	static components = {};

	static register (tag, component) {
		if (typeof this.components[tag] === 'undefined') {
			this.components[tag] = component;

			const components = this.components;
			window.customElements.define (tag, new Proxy (Component, {
				getPrototypeOf(target) {
					return Reflect.getPrototypeOf (target);
				},
				getOwnPropertyDescriptor (target, propertyKey) {
					return Reflect.getOwnPropertyDescriptor (components[tag]);
				},
				construct (target, args) {
					return document.createElement (components[tag].tag);
				},
				get (target, property, receiver) {
					console.log (target, property, receiver, components[tag]);
					return Reflect.get (components[tag], property, receiver);
				},
				set (target, property, value, receiver) {
					return Reflect.set (components[tag], property, value, receiver);
				},
				apply (target, receiver, args) {
					return Reflect.apply (components[tag], receiver, args);
				}
			}));
			this.components[tag]._registered = true;
		} else {
			throw new Error ('A component with this tag has already been registered. Use the evolve() function to modify the component.');
		}
	}

	static evolve (tag, component) {
		if (typeof this.components[tag] === 'undefined') {
			throw new Error ('No component with this tag has been registered. Cannot Evolve.');
		} else {
			const previousState = Object.assign ({} , this.components[tag].state);
			const previousProps = Object.assign ({} , this.components[tag].props);

			this.components[tag] = component;

			this.components[tag]._registered = true;
		}
	}

	static instances (tag, callback = null) {
		if (typeof this.components[tag] !== 'undefined') {
			if (typeof callback === 'function') {
				document.querySelectorAll (tag).forEach (callback);
			} else {
				return document.querySelectorAll (tag);
			}
		} else {
			throw new Error ('No component with the provided tag has been registered.');
		}
	}

	static instantiate (tag, props) {
		if (this._registered === false) {
			this.register ();
		}

		const element = document.createElement (this.components[tag]);
		element._setProps (props);

		return element;
	}
}