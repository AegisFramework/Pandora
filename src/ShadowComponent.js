import { Component } from './Component';
import { callAsync } from './Util';

export class ShadowComponent extends Component {
	constructor (...props) {
		super (...props);

		this._shadowDOM = this.attachShadow ({ mode: 'open' });
	}

	_createStyleElement () {
		if (!(this._styleElement instanceof HTMLStyleElement)) {
			this._styleElement = document.createElement ('style');
			this.dom.appendChild (this._styleElement);
		}
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
			this._shadowDOM.innerHTML = '';
			this._shadowDOM.appendChild (this._styleElement);
			this._shadowDOM.innerHTML += html;
		});
	}

	get dom () {
		return this._shadowDOM;
	}


}
