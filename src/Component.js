import { callAsync } from './Util';

/**
 * A component represents a custom HTML element, and has all of its functionality
 * as well as its general structure and representation self contained on it.
 *
 * @class Component
 */
export class Component extends HTMLElement {

	/**
	 * _tag {String} - The tag name for the component
	 *
	 * @static
	 */
	static _tag;

	static get tag () {
		if (typeof this._tag === 'undefined') {
			let tag = this.name;
			const matches = tag.match (/([A-Z])/g);
			if (matches !== null) {
				for (const match of matches) {
					tag = tag.replace (match, `-${match}`.toLowerCase ())
				}
			}
			this._tag = tag.slice (1);
		}
		return this._tag;
	};

	static set tag (value) {
		this._tag = value;
	}

	static _explicitPropTypes = ['boolean', 'string', 'number'];

	/**
	 *
	 *
	 * @static
	 */
	static _template = undefined;

	static template (html = null, context = null) {
		if (html !== null) {
			this._template = html;
			document.querySelectorAll(this.tagName).forEach((instance) => {
				if (instance._isReady) {
					instance.forceRender ();
				}
			});
		} else {

			// Check if no parameters were set but the HTML is still a function to be called
			if (typeof this._template === 'function') {
				return this._template.call (context);
			}

			// If this is reached, the HTML was just a string
			return this._template;
		}
	}

	constructor () {
		super ();

		// State Object for the component
		this._state = {};

		// Props Object for the component
		this._props = {};

		// List of callbacks to run once the component has been mounted successfully
		this._ready = [];

		this._connected = false;
		this._isReady = false;
	}

	/**
	 * width - Determines the real (computed) width of the element
	 *
	 * @return {int} - Computed Width of the element on pixels
	 */
	get width () {
		return parseInt (getComputedStyle (this).width.replace ('px', ''));
	}

	set width (value) {
		this.style.width = value;
	}

	/**
	 * height - Determines the real (computed) height of the element
	 *
	 * @return {int} - Computed height of the element on pixels
	 */
	get height () {
		return parseInt (getComputedStyle(this).height.replace ('px', ''));
	}

	set height (value) {
		this.style.height = value;
	}

	get static () {
		return new Proxy (this.constructor, {});
	}

	set static (value) {
		throw new Error ('Component static properties cannot be reassigned.');
	}

	get props () {
		return new Proxy (this, {
			get: (target, key) => {
				if (this.hasAttribute (key)) {
					return this.getAttribute (key);
				} else if (key in this._props) {
					return this._props[key];
				}
				return null;
			},
			set: (target, key, value) => {
				throw new Error ('Component props should be set using the `setProps` function.');
			}
		});
	}

	set props (value) {
		if (this._connected === false) {
			this._props = Object.assign ({}, this._props, value);
		} else {
			throw new Error ('Component props cannot be directly assigned. Use the `setProps` function instead.');
		}
	}

	get state () {
		return new Proxy (this._state, {
			get: (target, key) => {
				return target[key];
			},
			set: (target, key, value) => {
				if (this._connected === false) {
					return target[key] = value;
				} else {
					throw new Error ('Component state should be set using the `setState` function instead.');
				}

			}
		});
	}

	set state (value) {
		if (this._connected === false) {
			this._state = Object.assign ({}, this._state, value);
		} else {
			throw new Error ('Component state should be set using the `setState` function instead.');
		}
	}

	get dom () {
		return this;
	}

	set dom (value) {
		throw new Error ('Component DOM can not be overwritten.');
	}

	/**
	 * template - A simple function providing access to the basic HTML
	 * structure of the component.
	 *
	 * @param {function|string} html - A string or function that renders the
	 * component into a valid HTML structure.
	 *
	 * @returns {void|string} - Void or the HTML structure in a string
	 */
	template (html = null) {
		return this.static.template (html, this);
	}


	setState (state) {
		if (typeof state === 'object') {
			const oldState = Object.assign ({}, this._state);

			this._state = Object.assign ({}, this._state, state);

			for (const key of Object.keys (state)) {
				this.updateCallback (key, oldState[key], this._state[key], 'state', oldState, this._state);
			}
		} else {
			throw new TypeError(`A state must be an object. Received ${typeof state}.`)
		}
	}

	setProps (props) {
		if (typeof props === 'object') {
			const oldProps = Object.assign ({}, this._props);

			this._props = Object.assign ({}, this._props, props);

			for (const key of Object.keys (props)) {
				this.updateCallback (key, oldProps[key], this._props[key], 'props', oldProps, this._props);
			}
			this._setPropAttributes (true);
		} else {
			throw new TypeError(`Props must be an object. Received ${typeof state}.`)
		}
	}

	_setPropAttributes (update = false) {
		for (const key of Object.keys (this._props)) {
			const value = this._props[key];
			if (this.static._explicitPropTypes.indexOf (typeof value) > -1) {
				if (update === true) {
					this.setAttribute (key, this._props[key]);
				} else {
					this._props[key] = this.props[key];
					this.setAttribute (key, this.props[key]);
				}

			}
		}
	}

	/*
	 * =========================
	 * Update Cycle
	 * =========================
     */

	willUpdate (origin, property, oldValue, newValue, oldObject, newObject) {
		return Promise.resolve ();
	}

	update (origin, property, oldValue, newValue, oldObject, newObject) {
		return Promise.resolve ();
	}

	didUpdate (origin, property, oldValue, newValue, oldObject, newObject) {
		return Promise.resolve ();
	}

	onStateUpdate (property, oldValue, newValue, oldObject, newObject) {
		return Promise.resolve ();
	}

	onPropsUpdate (property, oldValue, newValue, oldObject, newObject) {
		return Promise.resolve ();
	}

	/*
	 * =========================
	 * Mount Cycle
	 * =========================
     */

	willMount () {
		return Promise.resolve ();
	}

	didMount () {
		return Promise.resolve ();
	}

	/*
	 * =========================
	 * Unmount Cycle
	 * =========================
     */

	willUnmount () {
		return Promise.resolve ();
	}

	unmount () {
		return Promise.resolve ();
	}

	didUnmount () {
		return Promise.resolve ();
	}

	/*
	 * =========================
	 * Render Cycle
	 * =========================
     */

	/**
	 * Forces the component to be rendered again.
	 *
	 * @returns {string|Promise<string>} - The HTML to render on the component
	 */
	forceRender () {
		return this._render ();
	}

	/**
	 * This function is the one that defines the HTML that will be rendered
	 * inside the component. Since some content may need to be loaded before the
	 * component is rendered, this function can also return a promise.
	 *
	 * @returns {string|Promise<string>} - The HTML to render on the component
	 */
	render () {
		return '';
	}

	_render () {
		let render = this.render;

		// Check if a template has been set to this component, and if that's the
		// case, use that instead of the render function to render the component's
		// HTML code.
		if (this.static._template !== null) {
			render = this.template;
		}

		// Call the render function asynchronously and set the HTML from it to the
		// component.
		return callAsync (render, this).then ((html) => {
			this.innerHTML = html;
		});
	}

	connectedCallback () {
		// Set the state as connected
		this._connected = true;

		// Add a data property with the tag of the component
		this.dataset.component = this.static.tag;

		// Check if a template for this component was set. The contents on this
		// if block will only be run once.
		if (typeof this.static._template === 'undefined') {

			// Check if there is an HTML template for this component
			const template = document.querySelector (`template#${this.static.tag}`);

			if (template !== null) {
				// If there is, set is as the template for the component
				this.template (template.innerHTML);
			} else {
				// If not, set is as null
				this.static._template = null;
			}
		}

		// Set the initial prop attributes for the component using the given
		// props
		this._setPropAttributes ();

		// Start the Mount Cycle
		return this.willMount ().then (() => {
			return this._render ().then (() => {
				return this.didMount ().then (() => {

					this._isReady = true;
					for (const callback of this._ready) {
						callback.call (this);
					}
				});
			});
		});
	}

	/**
	 * Adds a callback to be run once the component has been mounted successfully
	 *
	 * @param {function} callback - Callback to run once the component is ready
	 */
	ready (callback) {
		this._ready.push (callback);
	}


	disconnectedCallback () {
		return this.willUnmount ().then (() => {
			return this.unmount ().then (() => {
				return this.didUnmount ();
			});
		});
	}

	updateCallback (property, oldValue, newValue, origin = 'props', oldObject = {}, newObject = {}) {
		return this.willUpdate (origin, property, oldValue, newValue, oldObject, newObject).then (() => {
			return this.update (origin, property, oldValue, newValue, oldObject, newObject).then (() => {
				let promise;
				if (origin === 'state') {
					promise = this.onStateUpdate (property, oldValue, newValue, oldObject, newObject);
				} else {
					promise = this.onPropsUpdate (property, oldValue, newValue, oldObject, newObject);
				}
				return promise.then (() => {
					return this.didUpdate (origin, property, oldValue, newValue, oldObject, newObject);
				});
			});
		}).catch ((e) => {
			console.error (e);
			// Component should not update
		});
	}

	attributeChangedCallback (property, oldValue, newValue) {

	}
}
