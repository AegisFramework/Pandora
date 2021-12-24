## Classes

<dl>
<dt><a href="#Component">Component</a></dt>
<dd></dd>
<dt><a href="#ShadowComponent">ShadowComponent</a></dt>
<dd></dd>
<dt><a href="#Component">Component</a></dt>
<dd></dd>
<dt><a href="#ShadowComponent">ShadowComponent</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#callAsync">callAsync(callable, context, ...args)</a></dt>
<dd></dd>
<dt><a href="#deserializeCSS">deserializeCSS(object, encapsulation, level)</a></dt>
<dd></dd>
</dl>

<a name="Component"></a>

## Component
**Kind**: global class  

* [Component](#Component)
    * [new Component()](#new_Component_new)
    * [new Component()](#new_Component_new)
    * _instance_
        * [._tag](#Component+_tag)
        * [._explicitPropTypes](#Component+_explicitPropTypes)
        * [._template](#Component+_template)
        * [.width](#Component+width) ⇒ <code>int</code>
        * [.height](#Component+height) ⇒ <code>int</code>
        * [._tag](#Component+_tag)
        * [._explicitPropTypes](#Component+_explicitPropTypes)
        * [._template](#Component+_template)
        * [.width](#Component+width) ⇒ <code>int</code>
        * [.height](#Component+height) ⇒ <code>int</code>
        * [.template(html)](#Component+template) ⇒ <code>void</code> \| <code>string</code>
        * [.forceRender()](#Component+forceRender) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.render()](#Component+render) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.ready(callback)](#Component+ready)
        * [.template(html)](#Component+template) ⇒ <code>void</code> \| <code>string</code>
        * [.forceRender()](#Component+forceRender) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.render()](#Component+render) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.ready(callback)](#Component+ready)
    * _static_
        * [.register()](#Component.register)
        * [.register()](#Component.register)

<a name="new_Component_new"></a>

### new Component()
A component represents a custom HTML element, and has all of its functionality
as well as its general structure and representation self contained on it.

<a name="new_Component_new"></a>

### new Component()
A component represents a custom HTML element, and has all of its functionality
as well as its general structure and representation self contained on it.

<a name="Component+_tag"></a>

### component.\_tag
_tag {String} - The tag name for the component

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_explicitPropTypes"></a>

### component.\_explicitPropTypes
These are the types that can be set as properties on the HTML code of the
element.

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_template"></a>

### component.\_template
**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+width"></a>

### component.width ⇒ <code>int</code>
width - Determines the real (computed) width of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed Width of the element on pixels  
<a name="Component+height"></a>

### component.height ⇒ <code>int</code>
height - Determines the real (computed) height of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed height of the element on pixels  
<a name="Component+_tag"></a>

### component.\_tag
_tag {String} - The tag name for the component

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_explicitPropTypes"></a>

### component.\_explicitPropTypes
These are the types that can be set as properties on the HTML code of the
element.

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_template"></a>

### component.\_template
**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+width"></a>

### component.width ⇒ <code>int</code>
width - Determines the real (computed) width of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed Width of the element on pixels  
<a name="Component+height"></a>

### component.height ⇒ <code>int</code>
height - Determines the real (computed) height of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed height of the element on pixels  
<a name="Component+template"></a>

### component.template(html) ⇒ <code>void</code> \| <code>string</code>
template - A simple function providing access to the basic HTML
structure of the component.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>void</code> \| <code>string</code> - - Void or the HTML structure in a string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| html | <code>function</code> \| <code>string</code> | <code></code> | A string or function that renders the component into a valid HTML structure. |

<a name="Component+forceRender"></a>

### component.forceRender() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
Forces the component to be rendered again.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+render"></a>

### component.render() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
This function is the one that defines the HTML that will be rendered
inside the component. Since some content may need to be loaded before the
component is rendered, this function can also return a promise.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+ready"></a>

### component.ready(callback)
Adds a callback to be run once the component has been mounted successfully

**Kind**: instance method of [<code>Component</code>](#Component)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback to run once the component is ready |

<a name="Component+template"></a>

### component.template(html) ⇒ <code>void</code> \| <code>string</code>
template - A simple function providing access to the basic HTML
structure of the component.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>void</code> \| <code>string</code> - - Void or the HTML structure in a string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| html | <code>function</code> \| <code>string</code> | <code></code> | A string or function that renders the component into a valid HTML structure. |

<a name="Component+forceRender"></a>

### component.forceRender() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
Forces the component to be rendered again.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+render"></a>

### component.render() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
This function is the one that defines the HTML that will be rendered
inside the component. Since some content may need to be loaded before the
component is rendered, this function can also return a promise.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+ready"></a>

### component.ready(callback)
Adds a callback to be run once the component has been mounted successfully

**Kind**: instance method of [<code>Component</code>](#Component)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback to run once the component is ready |

<a name="Component.register"></a>

### Component.register()
register - Register the component as a custom HTML element
using the component's tag as the actual element tag.

This action cannot be reverted nor the controller class for
the element can be changed.

**Kind**: static method of [<code>Component</code>](#Component)  
<a name="Component.register"></a>

### Component.register()
register - Register the component as a custom HTML element
using the component's tag as the actual element tag.

This action cannot be reverted nor the controller class for
the element can be changed.

**Kind**: static method of [<code>Component</code>](#Component)  
<a name="ShadowComponent"></a>

## ShadowComponent
**Kind**: global class  
<a name="Component"></a>

## Component
**Kind**: global class  

* [Component](#Component)
    * [new Component()](#new_Component_new)
    * [new Component()](#new_Component_new)
    * _instance_
        * [._tag](#Component+_tag)
        * [._explicitPropTypes](#Component+_explicitPropTypes)
        * [._template](#Component+_template)
        * [.width](#Component+width) ⇒ <code>int</code>
        * [.height](#Component+height) ⇒ <code>int</code>
        * [._tag](#Component+_tag)
        * [._explicitPropTypes](#Component+_explicitPropTypes)
        * [._template](#Component+_template)
        * [.width](#Component+width) ⇒ <code>int</code>
        * [.height](#Component+height) ⇒ <code>int</code>
        * [.template(html)](#Component+template) ⇒ <code>void</code> \| <code>string</code>
        * [.forceRender()](#Component+forceRender) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.render()](#Component+render) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.ready(callback)](#Component+ready)
        * [.template(html)](#Component+template) ⇒ <code>void</code> \| <code>string</code>
        * [.forceRender()](#Component+forceRender) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.render()](#Component+render) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.ready(callback)](#Component+ready)
    * _static_
        * [.register()](#Component.register)
        * [.register()](#Component.register)

<a name="new_Component_new"></a>

### new Component()
A component represents a custom HTML element, and has all of its functionality
as well as its general structure and representation self contained on it.

<a name="new_Component_new"></a>

### new Component()
A component represents a custom HTML element, and has all of its functionality
as well as its general structure and representation self contained on it.

<a name="Component+_tag"></a>

### component.\_tag
_tag {String} - The tag name for the component

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_explicitPropTypes"></a>

### component.\_explicitPropTypes
These are the types that can be set as properties on the HTML code of the
element.

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_template"></a>

### component.\_template
**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+width"></a>

### component.width ⇒ <code>int</code>
width - Determines the real (computed) width of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed Width of the element on pixels  
<a name="Component+height"></a>

### component.height ⇒ <code>int</code>
height - Determines the real (computed) height of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed height of the element on pixels  
<a name="Component+_tag"></a>

### component.\_tag
_tag {String} - The tag name for the component

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_explicitPropTypes"></a>

### component.\_explicitPropTypes
These are the types that can be set as properties on the HTML code of the
element.

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_template"></a>

### component.\_template
**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+width"></a>

### component.width ⇒ <code>int</code>
width - Determines the real (computed) width of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed Width of the element on pixels  
<a name="Component+height"></a>

### component.height ⇒ <code>int</code>
height - Determines the real (computed) height of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed height of the element on pixels  
<a name="Component+template"></a>

### component.template(html) ⇒ <code>void</code> \| <code>string</code>
template - A simple function providing access to the basic HTML
structure of the component.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>void</code> \| <code>string</code> - - Void or the HTML structure in a string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| html | <code>function</code> \| <code>string</code> | <code></code> | A string or function that renders the component into a valid HTML structure. |

<a name="Component+forceRender"></a>

### component.forceRender() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
Forces the component to be rendered again.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+render"></a>

### component.render() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
This function is the one that defines the HTML that will be rendered
inside the component. Since some content may need to be loaded before the
component is rendered, this function can also return a promise.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+ready"></a>

### component.ready(callback)
Adds a callback to be run once the component has been mounted successfully

**Kind**: instance method of [<code>Component</code>](#Component)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback to run once the component is ready |

<a name="Component+template"></a>

### component.template(html) ⇒ <code>void</code> \| <code>string</code>
template - A simple function providing access to the basic HTML
structure of the component.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>void</code> \| <code>string</code> - - Void or the HTML structure in a string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| html | <code>function</code> \| <code>string</code> | <code></code> | A string or function that renders the component into a valid HTML structure. |

<a name="Component+forceRender"></a>

### component.forceRender() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
Forces the component to be rendered again.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+render"></a>

### component.render() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
This function is the one that defines the HTML that will be rendered
inside the component. Since some content may need to be loaded before the
component is rendered, this function can also return a promise.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+ready"></a>

### component.ready(callback)
Adds a callback to be run once the component has been mounted successfully

**Kind**: instance method of [<code>Component</code>](#Component)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback to run once the component is ready |

<a name="Component.register"></a>

### Component.register()
register - Register the component as a custom HTML element
using the component's tag as the actual element tag.

This action cannot be reverted nor the controller class for
the element can be changed.

**Kind**: static method of [<code>Component</code>](#Component)  
<a name="Component.register"></a>

### Component.register()
register - Register the component as a custom HTML element
using the component's tag as the actual element tag.

This action cannot be reverted nor the controller class for
the element can be changed.

**Kind**: static method of [<code>Component</code>](#Component)  
<a name="ShadowComponent"></a>

## ShadowComponent
**Kind**: global class  
<a name="callAsync"></a>

## callAsync(callable, context, ...args)
**Kind**: global function  

| Param | Type |
| --- | --- |
| callable | <code>\*</code> | 
| context | <code>\*</code> | 
| ...args | <code>any</code> | 

<a name="deserializeCSS"></a>

## deserializeCSS(object, encapsulation, level)
**Kind**: global function  

| Param | Type |
| --- | --- |
| object | <code>\*</code> | 
| encapsulation | <code>\*</code> | 
| level | <code>\*</code> | 

## Classes

<dl>
<dt><a href="#Component">Component</a></dt>
<dd></dd>
<dt><a href="#ShadowComponent">ShadowComponent</a></dt>
<dd></dd>
<dt><a href="#Component">Component</a></dt>
<dd></dd>
<dt><a href="#ShadowComponent">ShadowComponent</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#callAsync">callAsync(callable, context, ...args)</a></dt>
<dd></dd>
<dt><a href="#deserializeCSS">deserializeCSS(object, encapsulation, level)</a></dt>
<dd></dd>
</dl>

<a name="Component"></a>

## Component
**Kind**: global class  

* [Component](#Component)
    * [new Component()](#new_Component_new)
    * [new Component()](#new_Component_new)
    * _instance_
        * [._tag](#Component+_tag)
        * [._explicitPropTypes](#Component+_explicitPropTypes)
        * [._template](#Component+_template)
        * [.width](#Component+width) ⇒ <code>int</code>
        * [.height](#Component+height) ⇒ <code>int</code>
        * [._tag](#Component+_tag)
        * [._explicitPropTypes](#Component+_explicitPropTypes)
        * [._template](#Component+_template)
        * [.width](#Component+width) ⇒ <code>int</code>
        * [.height](#Component+height) ⇒ <code>int</code>
        * [.template(html)](#Component+template) ⇒ <code>void</code> \| <code>string</code>
        * [.forceRender()](#Component+forceRender) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.render()](#Component+render) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.ready(callback)](#Component+ready)
        * [.template(html)](#Component+template) ⇒ <code>void</code> \| <code>string</code>
        * [.forceRender()](#Component+forceRender) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.render()](#Component+render) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.ready(callback)](#Component+ready)
    * _static_
        * [.register()](#Component.register)
        * [.register()](#Component.register)

<a name="new_Component_new"></a>

### new Component()
A component represents a custom HTML element, and has all of its functionality
as well as its general structure and representation self contained on it.

<a name="new_Component_new"></a>

### new Component()
A component represents a custom HTML element, and has all of its functionality
as well as its general structure and representation self contained on it.

<a name="Component+_tag"></a>

### component.\_tag
_tag {String} - The tag name for the component

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_explicitPropTypes"></a>

### component.\_explicitPropTypes
These are the types that can be set as properties on the HTML code of the
element.

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_template"></a>

### component.\_template
**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+width"></a>

### component.width ⇒ <code>int</code>
width - Determines the real (computed) width of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed Width of the element on pixels  
<a name="Component+height"></a>

### component.height ⇒ <code>int</code>
height - Determines the real (computed) height of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed height of the element on pixels  
<a name="Component+_tag"></a>

### component.\_tag
_tag {String} - The tag name for the component

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_explicitPropTypes"></a>

### component.\_explicitPropTypes
These are the types that can be set as properties on the HTML code of the
element.

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_template"></a>

### component.\_template
**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+width"></a>

### component.width ⇒ <code>int</code>
width - Determines the real (computed) width of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed Width of the element on pixels  
<a name="Component+height"></a>

### component.height ⇒ <code>int</code>
height - Determines the real (computed) height of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed height of the element on pixels  
<a name="Component+template"></a>

### component.template(html) ⇒ <code>void</code> \| <code>string</code>
template - A simple function providing access to the basic HTML
structure of the component.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>void</code> \| <code>string</code> - - Void or the HTML structure in a string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| html | <code>function</code> \| <code>string</code> | <code></code> | A string or function that renders the component into a valid HTML structure. |

<a name="Component+forceRender"></a>

### component.forceRender() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
Forces the component to be rendered again.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+render"></a>

### component.render() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
This function is the one that defines the HTML that will be rendered
inside the component. Since some content may need to be loaded before the
component is rendered, this function can also return a promise.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+ready"></a>

### component.ready(callback)
Adds a callback to be run once the component has been mounted successfully

**Kind**: instance method of [<code>Component</code>](#Component)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback to run once the component is ready |

<a name="Component+template"></a>

### component.template(html) ⇒ <code>void</code> \| <code>string</code>
template - A simple function providing access to the basic HTML
structure of the component.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>void</code> \| <code>string</code> - - Void or the HTML structure in a string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| html | <code>function</code> \| <code>string</code> | <code></code> | A string or function that renders the component into a valid HTML structure. |

<a name="Component+forceRender"></a>

### component.forceRender() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
Forces the component to be rendered again.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+render"></a>

### component.render() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
This function is the one that defines the HTML that will be rendered
inside the component. Since some content may need to be loaded before the
component is rendered, this function can also return a promise.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+ready"></a>

### component.ready(callback)
Adds a callback to be run once the component has been mounted successfully

**Kind**: instance method of [<code>Component</code>](#Component)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback to run once the component is ready |

<a name="Component.register"></a>

### Component.register()
register - Register the component as a custom HTML element
using the component's tag as the actual element tag.

This action cannot be reverted nor the controller class for
the element can be changed.

**Kind**: static method of [<code>Component</code>](#Component)  
<a name="Component.register"></a>

### Component.register()
register - Register the component as a custom HTML element
using the component's tag as the actual element tag.

This action cannot be reverted nor the controller class for
the element can be changed.

**Kind**: static method of [<code>Component</code>](#Component)  
<a name="ShadowComponent"></a>

## ShadowComponent
**Kind**: global class  
<a name="Component"></a>

## Component
**Kind**: global class  

* [Component](#Component)
    * [new Component()](#new_Component_new)
    * [new Component()](#new_Component_new)
    * _instance_
        * [._tag](#Component+_tag)
        * [._explicitPropTypes](#Component+_explicitPropTypes)
        * [._template](#Component+_template)
        * [.width](#Component+width) ⇒ <code>int</code>
        * [.height](#Component+height) ⇒ <code>int</code>
        * [._tag](#Component+_tag)
        * [._explicitPropTypes](#Component+_explicitPropTypes)
        * [._template](#Component+_template)
        * [.width](#Component+width) ⇒ <code>int</code>
        * [.height](#Component+height) ⇒ <code>int</code>
        * [.template(html)](#Component+template) ⇒ <code>void</code> \| <code>string</code>
        * [.forceRender()](#Component+forceRender) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.render()](#Component+render) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.ready(callback)](#Component+ready)
        * [.template(html)](#Component+template) ⇒ <code>void</code> \| <code>string</code>
        * [.forceRender()](#Component+forceRender) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.render()](#Component+render) ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
        * [.ready(callback)](#Component+ready)
    * _static_
        * [.register()](#Component.register)
        * [.register()](#Component.register)

<a name="new_Component_new"></a>

### new Component()
A component represents a custom HTML element, and has all of its functionality
as well as its general structure and representation self contained on it.

<a name="new_Component_new"></a>

### new Component()
A component represents a custom HTML element, and has all of its functionality
as well as its general structure and representation self contained on it.

<a name="Component+_tag"></a>

### component.\_tag
_tag {String} - The tag name for the component

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_explicitPropTypes"></a>

### component.\_explicitPropTypes
These are the types that can be set as properties on the HTML code of the
element.

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_template"></a>

### component.\_template
**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+width"></a>

### component.width ⇒ <code>int</code>
width - Determines the real (computed) width of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed Width of the element on pixels  
<a name="Component+height"></a>

### component.height ⇒ <code>int</code>
height - Determines the real (computed) height of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed height of the element on pixels  
<a name="Component+_tag"></a>

### component.\_tag
_tag {String} - The tag name for the component

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_explicitPropTypes"></a>

### component.\_explicitPropTypes
These are the types that can be set as properties on the HTML code of the
element.

**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+_template"></a>

### component.\_template
**Kind**: instance property of [<code>Component</code>](#Component)  
<a name="Component+width"></a>

### component.width ⇒ <code>int</code>
width - Determines the real (computed) width of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed Width of the element on pixels  
<a name="Component+height"></a>

### component.height ⇒ <code>int</code>
height - Determines the real (computed) height of the element

**Kind**: instance property of [<code>Component</code>](#Component)  
**Returns**: <code>int</code> - - Computed height of the element on pixels  
<a name="Component+template"></a>

### component.template(html) ⇒ <code>void</code> \| <code>string</code>
template - A simple function providing access to the basic HTML
structure of the component.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>void</code> \| <code>string</code> - - Void or the HTML structure in a string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| html | <code>function</code> \| <code>string</code> | <code></code> | A string or function that renders the component into a valid HTML structure. |

<a name="Component+forceRender"></a>

### component.forceRender() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
Forces the component to be rendered again.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+render"></a>

### component.render() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
This function is the one that defines the HTML that will be rendered
inside the component. Since some content may need to be loaded before the
component is rendered, this function can also return a promise.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+ready"></a>

### component.ready(callback)
Adds a callback to be run once the component has been mounted successfully

**Kind**: instance method of [<code>Component</code>](#Component)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback to run once the component is ready |

<a name="Component+template"></a>

### component.template(html) ⇒ <code>void</code> \| <code>string</code>
template - A simple function providing access to the basic HTML
structure of the component.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>void</code> \| <code>string</code> - - Void or the HTML structure in a string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| html | <code>function</code> \| <code>string</code> | <code></code> | A string or function that renders the component into a valid HTML structure. |

<a name="Component+forceRender"></a>

### component.forceRender() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
Forces the component to be rendered again.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+render"></a>

### component.render() ⇒ <code>string</code> \| <code>Promise.&lt;string&gt;</code>
This function is the one that defines the HTML that will be rendered
inside the component. Since some content may need to be loaded before the
component is rendered, this function can also return a promise.

**Kind**: instance method of [<code>Component</code>](#Component)  
**Returns**: <code>string</code> \| <code>Promise.&lt;string&gt;</code> - - The HTML to render on the component  
<a name="Component+ready"></a>

### component.ready(callback)
Adds a callback to be run once the component has been mounted successfully

**Kind**: instance method of [<code>Component</code>](#Component)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | Callback to run once the component is ready |

<a name="Component.register"></a>

### Component.register()
register - Register the component as a custom HTML element
using the component's tag as the actual element tag.

This action cannot be reverted nor the controller class for
the element can be changed.

**Kind**: static method of [<code>Component</code>](#Component)  
<a name="Component.register"></a>

### Component.register()
register - Register the component as a custom HTML element
using the component's tag as the actual element tag.

This action cannot be reverted nor the controller class for
the element can be changed.

**Kind**: static method of [<code>Component</code>](#Component)  
<a name="ShadowComponent"></a>

## ShadowComponent
**Kind**: global class  
<a name="callAsync"></a>

## callAsync(callable, context, ...args)
**Kind**: global function  

| Param | Type |
| --- | --- |
| callable | <code>\*</code> | 
| context | <code>\*</code> | 
| ...args | <code>any</code> | 

<a name="deserializeCSS"></a>

## deserializeCSS(object, encapsulation, level)
**Kind**: global function  

| Param | Type |
| --- | --- |
| object | <code>\*</code> | 
| encapsulation | <code>\*</code> | 
| level | <code>\*</code> | 

