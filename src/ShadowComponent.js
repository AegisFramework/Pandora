import { Component } from './Component';
import { callAsync, deserializeCSS } from './Util';

export class ShadowComponent extends Component {
	constructor (...props) {
		super (...props);

		this._style = {};

		this._shadowDOM = this.attachShadow ({ mode: 'open' });

		this._styleElement = document.createElement ('style');

		this._shadowDOM.appendChild (this._styleElement);
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
			const div = document.createElement ('div');
			if (typeof html === 'string') {
				div.innerHTML = html.trim ();
			} else {
				div.innerHTML = html;
			}
			this._shadowDOM.appendChild (div.firstChild);
		});
	}

	style (style, reset = false) {
		if (typeof style === 'object') {
			if (reset === false) {
				this._style = Object.assign ({}, this._style, style);
			} else {
				this._style = Object.assign ({}, style);
			}
			this._styleElement.innerHTML = deserializeCSS (this._style);
		} else if (typeof style === 'string') {
			if (reset === false) {
				this._styleElement.innerHTML += style;
			} else {
				this._styleElement.innerHTML = style;
			}
		}

		return this._style;
	}
}
