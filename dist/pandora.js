// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"yzgE":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.callAsync = callAsync;
exports.deserializeCSS = deserializeCSS;

function callAsync(callable, context, ...args) {
  try {
    // Call the provided function using the context and arguments given
    const result = callable.apply(context, args); // Check if the function returned a simple value or a Promise

    if (result instanceof Promise) {
      return result;
    } else {
      return Promise.resolve(result);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

function deserializeCSS(object, level = 0) {
  const keys = Object.keys(object);
  let css = '';

  for (const key of keys) {
    console.log(key);

    if (typeof object[key] === 'object') {
      css += `${key} {\n`;
      const properties = Object.keys(object[key]);

      for (const property of properties) {
        console.log(object[key][property]);
        css += '\t'.repeat(level);

        if (typeof object[key][property] === 'object') {
          const temp = {};
          temp[property] = object[key][property];
          css += deserializeCSS(temp, level + 1);
        } else {
          css += `\t${property}: ${object[key][property]};\n`;
        }
      }

      css += '}\n';
    } else {
      css += '\t'.repeat(level);
      css += `\t${key}: ${object[key]};\n`;
    }
  }

  return css;
}
},{}],"Simw":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Component = void 0;

var _Util = require("./Util");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * A component represents a custom HTML element, and has all of its functionality
 * as well as its general structure and representation self contained on it.
 *
 * @class Component
 */
class Component extends HTMLElement {
  /**
   * _tag {String} - The tag name for the component
   *
   * @static
   */
  static get tag() {
    if (typeof this._tag === 'undefined') {
      let tag = this.name;
      const matches = tag.match(/([A-Z])/g);

      if (matches !== null) {
        for (const match of matches) {
          tag = tag.replace(match, `-${match}`.toLowerCase());
        }
      }

      this._tag = tag.slice(1);
    }

    return this._tag;
  }

  static set tag(value) {
    this._tag = value;
  }

  static template(html = null, context = null) {
    if (html !== null) {
      this._template = html;
      document.querySelectorAll(this.tagName).forEach(instance => {
        if (instance._isReady) {
          instance.forceRender();
        }
      });
    } else {
      // Check if no parameters were set but the HTML is still a function to be called
      if (typeof this._template === 'function') {
        return this._template.call(context);
      } // If this is reached, the HTML was just a string


      return this._template;
    }
  }

  constructor() {
    super(); // State Object for the component

    this._state = {}; // Props Object for the component

    this._props = {}; // List of callbacks to run once the component has been mounted successfully

    this._ready = [];
    this._connected = false;
    this._isReady = false;
  }
  /**
   * width - Determines the real (computed) width of the element
   *
   * @return {int} - Computed Width of the element on pixels
   */


  get width() {
    return parseInt(getComputedStyle(this).width.replace('px', ''));
  }

  set width(value) {
    this.style.width = value;
  }
  /**
   * height - Determines the real (computed) height of the element
   *
   * @return {int} - Computed height of the element on pixels
   */


  get height() {
    return parseInt(getComputedStyle(this).height.replace('px', ''));
  }

  set height(value) {
    this.style.height = value;
  }

  get static() {
    return new Proxy(this.constructor, {});
  }

  set static(value) {
    throw new Error('Component static properties cannot be reassigned.');
  }

  get props() {
    return new Proxy(this, {
      get: (target, key) => {
        if (this.hasAttribute(key)) {
          return this.getAttribute(key);
        } else if (key in this._props) {
          return this._props[key];
        }

        return null;
      },
      set: (target, key, value) => {
        throw new Error('Component props should be set using the `setProps` function.');
      }
    });
  }

  set props(value) {
    if (this._connected === false) {
      this._props = Object.assign({}, this._props, value);
    } else {
      throw new Error('Component props cannot be directly assigned. Use the `setProps` function instead.');
    }
  }

  get state() {
    return new Proxy(this._state, {
      get: (target, key) => {
        return target[key];
      },
      set: (target, key, value) => {
        if (this._connected === false) {
          return target[key] = value;
        } else {
          throw new Error('Component state should be set using the `setState` function instead.');
        }
      }
    });
  }

  set state(value) {
    if (this._connected === false) {
      this._state = Object.assign({}, this._state, value);
    } else {
      throw new Error('Component state should be set using the `setState` function instead.');
    }
  }

  get dom() {
    return this;
  }

  set dom(value) {
    throw new Error('Component DOM can not be overwritten.');
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


  template(html = null) {
    return this.static.template(html, this);
  }

  setState(state) {
    if (typeof state === 'object') {
      const oldState = Object.assign({}, this._state);
      this._state = Object.assign({}, this._state, state);

      for (const key of Object.keys(state)) {
        this.updateCallback(key, oldState[key], this._state[key], 'state', oldState, this._state);
      }
    } else {
      throw new TypeError(`A state must be an object. Received ${typeof state}.`);
    }
  }

  setProps(props) {
    if (typeof props === 'object') {
      const oldProps = Object.assign({}, this._props);
      this._props = Object.assign({}, this._props, props);

      for (const key of Object.keys(props)) {
        this.updateCallback(key, oldProps[key], this._props[key], 'props', oldProps, this._props);
      }

      this._setPropAttributes(true);
    } else {
      throw new TypeError(`Props must be an object. Received ${typeof state}.`);
    }
  }

  _setPropAttributes(update = false) {
    for (const key of Object.keys(this._props)) {
      const value = this._props[key];
      console.log(key, value);

      if (this.static._explicitPropTypes.indexOf(typeof value) > -1) {
        if (update === true) {
          this.setAttribute(key, this._props[key]);
        } else {
          this._props[key] = this.props[key];
          this.setAttribute(key, this.props[key]);
        }
      }
    }
  }
  /*
   * =========================
   * Update Cycle
   * =========================
      */


  willUpdate(origin, property, oldValue, newValue, oldObject, newObject) {
    return Promise.resolve();
  }

  update(origin, property, oldValue, newValue, oldObject, newObject) {
    return Promise.resolve();
  }

  didUpdate(origin, property, oldValue, newValue, oldObject, newObject) {
    return Promise.resolve();
  }

  onStateUpdate(property, oldValue, newValue, oldObject, newObject) {
    return Promise.resolve();
  }

  onPropsUpdate(property, oldValue, newValue, oldObject, newObject) {
    return Promise.resolve();
  }
  /*
   * =========================
   * Mount Cycle
   * =========================
      */


  willMount() {
    return Promise.resolve();
  }

  didMount() {
    return Promise.resolve();
  }
  /*
   * =========================
   * Unmount Cycle
   * =========================
      */


  willUnmount() {
    return Promise.resolve();
  }

  unmount() {
    return Promise.resolve();
  }

  didUnmount() {
    return Promise.resolve();
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


  forceRender() {
    return this._render();
  }
  /**
   * This function is the one that defines the HTML that will be rendered
   * inside the component. Since some content may need to be loaded before the
   * component is rendered, this function can also return a promise.
   *
   * @returns {string|Promise<string>} - The HTML to render on the component
   */


  render() {
    return '';
  }

  _render() {
    let render = this.render; // Check if a template has been set to this component, and if that's the
    // case, use that instead of the render function to render the component's
    // HTML code.

    if (this.static._template !== null) {
      render = this.template;
    } // Call the render function asynchronously and set the HTML from it to the
    // component.


    return (0, _Util.callAsync)(render, this).then(html => {
      this.innerHTML = html;
    });
  }

  connectedCallback() {
    // Set the state as connected
    this._connected = true; // Add a data property with the tag of the component

    this.dataset.component = this.static.tag; // Always add the animated class for all the components

    this.classList.add('animated'); // Check if a template for this component was set. The contents on this
    // if block will only be run once.

    if (typeof this.static._template === 'undefined') {
      // Check if there is an HTML template for this component
      const template = document.querySelector(`template#${this.static.tag}`);

      if (template !== null) {
        // If there is, set is as the template for the component
        this.template(template.innerHTML);
      } else {
        // If not, set is as null
        this.static._template = null;
      }
    } // Set the initial prop attributes for the component using the given
    // props


    this._setPropAttributes(); // Start the Mount Cycle


    return this.willMount().then(() => {
      return this._render().then(() => {
        return this.didMount().then(() => {
          this._isReady = true;

          for (const callback of this._ready) {
            callback.call(this);
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


  ready(callback) {
    this._ready.push(callback);
  }

  disconnectedCallback() {
    return this.willUnmount().then(() => {
      return this.unmount().then(() => {
        return this.didUnmount();
      });
    });
  }

  updateCallback(property, oldValue, newValue, origin = 'props', oldObject = {}, newObject = {}) {
    return this.willUpdate(origin, property, oldValue, newValue, oldObject, newObject).then(() => {
      return this.update(origin, property, oldValue, newValue, oldObject, newObject).then(() => {
        let promise;

        if (origin === 'state') {
          promise = this.onStateUpdate(property, oldValue, newValue, oldObject, newObject);
        } else {
          promise = this.onPropsUpdate(property, oldValue, newValue, oldObject, newObject);
        }

        return promise.then(() => {
          return this.didUpdate(origin, property, oldValue, newValue, oldObject, newObject);
        });
      });
    }).catch(e => {
      console.error(e); // Component should not update
    });
  }

  attributeChangedCallback(property, oldValue, newValue) {
    console.log(property, oldValue, newValue);
  }

}

exports.Component = Component;

_defineProperty(Component, "_tag", void 0);

_defineProperty(Component, "_explicitPropTypes", ['boolean', 'string', 'number']);

_defineProperty(Component, "_template", undefined);
},{"./Util":"yzgE"}],"9Lec":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ShadowComponent = void 0;

var _Component = require("./Component");

var _Util = require("./Util");

class ShadowComponent extends _Component.Component {
  constructor(...props) {
    super(...props);
    this._style = {};
    this._shadowDOM = this.attachShadow({
      mode: 'open'
    });
    this._styleElement = document.createElement('style');

    this._shadowDOM.appendChild(this._styleElement);
  }

  _render() {
    let render = this.render; // Check if a template has been set to this component, and if that's the
    // case, use that instead of the render function to render the component's
    // HTML code.

    if (this.static._template !== null) {
      render = this.template;
    } // Call the render function asynchronously and set the HTML from it to the
    // component.


    return (0, _Util.callAsync)(render, this).then(html => {
      this._shadowDOM.innerHTML = '';

      this._shadowDOM.appendChild(this._styleElement);

      this._shadowDOM.innerHTML += html;
    });
  }

  get dom() {
    return this._shadowDOM;
  }

  setStyle(style, reset = false) {
    if (typeof style === 'object') {
      if (reset === false) {
        this._style = Object.assign({}, this._style, style);
      } else {
        this._style = Object.assign({}, style);
      }

      this._styleElement.innerHTML = (0, _Util.deserializeCSS)(this._style);
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

exports.ShadowComponent = ShadowComponent;
},{"./Component":"Simw","./Util":"yzgE"}],"Focm":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Component = require("./src/Component");

Object.keys(_Component).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _Component[key];
    }
  });
});

var _ShadowComponent = require("./src/ShadowComponent");

Object.keys(_ShadowComponent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _ShadowComponent[key];
    }
  });
});
},{"./src/Component":"Simw","./src/ShadowComponent":"9Lec"}]},{},["Focm"], "Pandora")
//# sourceMappingURL=pandora.js.map