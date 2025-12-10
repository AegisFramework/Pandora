const { Component, ShadowComponent, Registry, Register, Consumer, Prop, html, nothing } = Pandora;

Registry.debug = true;
console.log('[Test] Debug mode enabled');

const unsubscribeMount = Registry.onMount((component, tag) => {
	console.log(`[Lifecycle] Mounted: <${tag}>`);
});

const unsubscribeUnmount = Registry.onUnmount((component, tag) => {
	console.log(`[Lifecycle] Unmounted: <${tag}>`);
});

Registry.onError((error, component, tag, lifecycle) => {
	console.error(`[Error] <${tag}> in ${lifecycle}:`, error.message);
});

Registry.use('props', (component, props) => {
	console.log(`[Middleware:props] <${component.static.tag}>`, props);
	return props;
});

Registry.use('state', (component, state) => {
	console.log(`[Middleware:state] <${component.static.tag}>`, state);
	return state;
});

// ==========================================
// Basic Component
// ==========================================
class CustomElement extends Component {
	constructor() {
		super();

		this.props = { text: '' };
	}

	render() {
		return `<h2>${this.props.text}</h2>`;
	}
}

Registry.register('custom-element', CustomElement);

const element = document.querySelector('custom-element');

element.setProps({ text: 'Hello World!' });
element.setStyle({
	h2: { color: '#222' },
	'&:nth-child(4) h2': { color: '#f75c5f' }
});

// ==========================================
// Shadow DOM Component
// ==========================================
class CustomShadowElement extends ShadowComponent {
	constructor(...args) {
		super(...args);

		this.props = { text: '' };
	}

	render() {
		return `<h2>${this.props.text}</h2>`;
	}
}

Registry.register('custom-shadow-element', CustomShadowElement);

const shadowElement = document.querySelector('custom-shadow-element');

shadowElement.setProps({ text: 'Shadow DOM!' });
shadowElement.setStyle({
	h2: { color: '#666' },
	'@media screen and (min-width: 62em)': {
		h2: { color: 'black' }
	}
});

// ==========================================
// Counter Component (String Templates)
// ==========================================
class CounterComponent extends Component {
	constructor() {
		super();
		this.state = { count: 0 };
	}

	increment() {
		this.setState({ count: this.state.count + 1 });
		this.emit('count-changed', { count: this.state.count });
	}

	decrement() {
		this.setState({ count: this.state.count - 1 });
		this.emit('count-changed', { count: this.state.count });
	}

	didMount() {
		this.on('click', (event) => {
			if (event.target.matches('.increment')) {
        this.increment();
      }

			if (event.target.matches('.decrement')) {
        this.decrement();
      }
		});

		return Promise.resolve();
	}

	onStateUpdate(property, oldValue, newValue) {
		this.forceRender();

		return Promise.resolve();
	}

	render() {
		return `
			<div class="counter">
				<button class="decrement">-</button>
				<span class="count">${this.state.count}</span>
				<button class="increment">+</button>
			</div>
		`;
	}
}

Registry.register('counter-component', CounterComponent);

// ==========================================
// lit-html Component
// ==========================================
class LitCounter extends Component {
	constructor() {
		super();
		this.state = { count: 0 };
	}

	increment() {
		this.setState({ count: this.state.count + 1 });
	}

	decrement() {
		this.setState({ count: this.state.count - 1 });
	}

	onStateUpdate() {
		this.forceRender();
		return Promise.resolve();
	}

	render() {
		// Using lit-html for efficient DOM updates
		return html`
			<div class="counter">
				<button class="decrement" @click=${() => this.decrement()}>-</button>
				<span class="count">${this.state.count}</span>
				<button class="increment" @click=${() => this.increment()}>+</button>
			</div>
		`;
	}
}

Registry.register('lit-counter', LitCounter);
console.log('[lit-html] LitCounter registered with lit-html templates');

// ==========================================
// Shadow Component with lit-html
// ==========================================
class LitShadowCard extends ShadowComponent {
	constructor() {
		super();
		this.state = { expanded: false };
	}

	willMount() {
		// Constructable Stylesheets - shared across all instances
		this.setStyle({
			':host': {
				display: 'block',
				padding: '1rem',
				border: '1px solid #ddd',
				borderRadius: '8px'
			},
			'.header': {
				fontWeight: 'bold',
				marginBottom: '0.5rem'
			},
			'.content': {
				color: '#666'
			},
			'button': {
				marginTop: '0.5rem',
				padding: '0.25rem 0.5rem',
				cursor: 'pointer'
			}
		});
		return Promise.resolve();
	}

	toggle() {
		this.setState({ expanded: !this.state.expanded });
	}

	onStateUpdate() {
		this.forceRender();
		return Promise.resolve();
	}

	render() {
		return html`
			<div class="header">Shadow Card (lit-html)</div>
			<div class="content">
				${this.state.expanded
					? html`<p>Expanded content with more details!</p>`
					: nothing
				}
			</div>
			<button @click=${() => this.toggle()}>
				${this.state.expanded ? 'Collapse' : 'Expand'}
			</button>
		`;
	}
}

Registry.register('lit-shadow-card', LitShadowCard);
console.log('[lit-html] LitShadowCard registered with Shadow DOM + lit-html');

// ==========================================
// Global State Component
// ==========================================
class ThemeToggle extends Component {
	constructor() {
		super();

		this.state = {
			theme: Registry.getState('theme') || 'light'
		};
	}

	didMount() {
		this._unsubscribe = Registry.subscribe('theme', (newTheme) => {
			this.setState({ theme: newTheme });
			this.forceRender();
		});

		return Promise.resolve();
	}

	willUnmount() {
		if (this._unsubscribe) {
      this._unsubscribe();
    }

		return Promise.resolve();
	}

	toggleTheme() {
		const newTheme = this.state.theme === 'light' ? 'dark' : 'light';

    Registry.setState('theme', newTheme);
	}

	render() {
		return `
			<button class="theme-btn" onclick="this.closest('theme-toggle').toggleTheme()">
				Theme: ${this.state.theme}
			</button>
		`;
	}
}

Registry.register('theme-toggle', ThemeToggle);

// Initialize global theme state
Registry.setState('theme', 'light');

// ==========================================
// Component Alias
// ==========================================
Registry.alias('click-counter', 'counter-component');
Registry.alias('number-picker', 'counter-component');

console.log('[Alias] "click-counter" is alias:', Registry.isAlias('click-counter'));
console.log('[Alias] Original tag:', Registry.getOriginalTag('click-counter'));

// ==========================================
// Observed Attributes Component
// ==========================================
class AttributeWatcher extends Component {
	static observedAttributes = ['message', 'status'];

	constructor() {
		super();

		this.props = {
			message: 'Default message',
			status: 'idle'
		};
	}

	onPropsUpdate(property, oldValue, newValue) {
		console.log(`[AttributeWatcher] ${property}: ${oldValue} -> ${newValue}`);
		this.forceRender();

    return Promise.resolve();
	}

	render() {
		return `
			<div class="attribute-watcher">
				<p>Message: ${this.props.message}</p>
				<p>Status: ${this.props.status}</p>
			</div>
		`;
	}
}

Registry.register('attribute-watcher', AttributeWatcher);

// ==========================================
// Query Helpers Component
// ==========================================
class QueryDemo extends Component {
	didMount() {
		const title = this.query('h3');
		const items = this.queryAll('.item');

		console.log('[QueryDemo] Found title:', title?.textContent);
		console.log('[QueryDemo] Found items:', items.length);
		return Promise.resolve();
	}

	render() {
		return `
			<div class="query-demo">
				<h3>Query Demo</h3>
				<ul>
					<li class="item">Item 1</li>
					<li class="item">Item 2</li>
					<li class="item">Item 3</li>
				</ul>
			</div>
		`;
	}
}

Registry.register('query-demo', QueryDemo);

// ==========================================
// Once Event Demo
// ==========================================
class OnceDemo extends Component {
	constructor() {
		super();
		this.state = { clicked: false };
	}

	didMount() {
		this.once('click', () => {
			this.setState({ clicked: true });
			this.forceRender();
			console.log('[OnceDemo] Clicked! (will not fire again)');
		});

		return Promise.resolve();
	}

	render() {
		return `
			<button class="once-btn">
				${this.state.clicked ? 'Already clicked once!' : 'Click me (once only)'}
			</button>
		`;
	}
}

Registry.register('once-demo', OnceDemo);

// ==========================================
// Lazy Loaded Component
// ==========================================
Registry.lazy('lazy-component', async () => {
	// Simulate network delay
	await new Promise(resolve => setTimeout(resolve, 500));

	class LazyLoadedComponent extends Component {
		render() {
			return `
				<div class="lazy-loaded">
					<h4>Lazy Loaded!</h4>
					<p>This component was loaded on demand.</p>
				</div>
			`;
		}
	}

	return LazyLoadedComponent;
});

console.log('[Lazy] Is lazy-component lazy?', Registry.isLazy('lazy-component'));

// ==========================================
// Registry Stats Demo
// ==========================================
setTimeout(() => {
	console.log('[Stats] Registered components:', Registry.list());
	console.log('[Stats] All stats:', Registry.stats());
}, 1000);

// ==========================================
// Evolve Component
// ==========================================
class EvolvableComponent extends Component {
	render() {
		return `<p class="evolve-content">Version 1</p>`;
	}
}

Registry.register('evolvable-component', EvolvableComponent);

setTimeout(() => {
	class EvolvedComponent extends Component {
		render() {
			return `<p class="evolve-content evolved">Version 2</p>`;
		}
	}

	Registry.evolve('evolvable-component', EvolvedComponent, true);
	console.log('[Evolve] Component evolved to Version 2');
}, 3000);

// ==========================================
// Dynamic Instance Creation
// ==========================================
function addCounter() {
	const counter = Registry.instantiate('counter-component', {});
	document.querySelector('.dynamic-container').appendChild(counter);
}

function removeCounter() {
	const container = document.querySelector('.dynamic-container');
	const last = container.querySelector('counter-component:last-child');
	if (last) last.remove();
}

window.addCounter = addCounter;
window.removeCounter = removeCounter;

// ==========================================
// Responsive Navigation
// ==========================================
const navigation = document.querySelector('responsive-navigation');
if (navigation) {
	navigation.setProps({
    logo: 'https://aegisframework.com/assets/images/aegis.svg',
		items: [
			{ text: 'Home', link: '#' },
			{ text: 'Features', link: '#features' },
			{ text: 'Demo', link: '#demo' },
			{ text: 'Docs', link: '#docs' }
		]
	});
}

// ==========================================
// Decorator Tests (using functional equivalents for browser compatibility)
// Note: In TypeScript/transpiled code, you can use @Register, @Consumer, @Prop syntax
// ==========================================

// Test Register decorator (functional form)
class DecoratedComponent extends Component {
	render() {
		return html`<div class="decorated">Registered via Register() decorator!</div>`;
	}
}
Register('decorated-component')(DecoratedComponent);

console.log('[Decorator] Register(): decorated-component registered');
console.log('[Decorator] Has component:', Registry.has('decorated-component'));

// Test Consumer decorator (functional form)
Registry.setState('app.message', 'Hello from global state!');

class ConsumerDemo extends Component {
	render() {
		return html`<div class="consumer-demo">${this.message || 'No message'}</div>`;
	}
}
// Apply @Consumer decorator functionally
Consumer('app.message')(ConsumerDemo.prototype, 'message');
Register('consumer-demo')(ConsumerDemo);

console.log('[Decorator] Consumer(): consumer-demo registered');

// Test updating global state updates @Consumer properties
setTimeout(() => {
	Registry.setState('app.message', 'Updated message!');
	console.log('[Decorator] Consumer(): Global state updated, components should re-render');
}, 2000);

// Test Prop decorator (functional form)
class PropDemo extends Component {
	render() {
		return html`
			<div class="prop-demo">
				<p>Label: ${this.label}</p>
				<p>Custom: ${this.customValue}</p>
			</div>
		`;
	}
}
// Apply @Prop decorators functionally
Prop()(PropDemo.prototype, 'label');
Prop('custom-attr')(PropDemo.prototype, 'customValue');
Register('prop-demo')(PropDemo);

console.log('[Decorator] Prop(): prop-demo registered');

// ==========================================
// Static Template with lit-html
// ==========================================
class StaticLitTemplate extends Component {
	constructor() {
		super();
		this.props = { title: 'Static lit-html' };
	}
}

// Set static template using lit-html function
StaticLitTemplate.template((ctx) => html`
	<div class="static-lit-demo">
		<h4>${ctx.props.title}</h4>
		<button @click=${() => {
			ctx.setProps({ title: 'Clicked!' });
		}}>Update Title</button>
	</div>
`);

Registry.register('static-lit-template', StaticLitTemplate);
console.log('[Static Template] lit-html template registered');

// ==========================================
// slotContent Demo
// ==========================================
class SlotContentDemo extends Component {
	render() {
		return html`
			<div class="slot-content-wrapper">
				<h4>Wrapper Component</h4>
				<div class="projected-content">
					${this.slotContent}
				</div>
			</div>
		`;
	}
}

Registry.register('slot-content-demo', SlotContentDemo);
console.log('[slotContent] Demo component registered');

// ==========================================
// Type-Aware Middleware Demo
// ==========================================
Registry.use('render', (component, value, renderType) => {
	if (component.static.tag === 'middleware-demo') {
		console.log(`[Middleware] render type: ${renderType}`, typeof value);
	}
	return value;
});

class MiddlewareDemo extends Component {
	constructor() {
		super();
		this.state = { useLit: true };
	}

	render() {
		// Toggle between string and lit-html to test middleware
		if (this.state.useLit) {
			return html`<div class="middleware-demo">Using lit-html (renderType: lit)</div>`;
		}
		return '<div class="middleware-demo">Using string (renderType: string)</div>';
	}
}

Registry.register('middleware-demo', MiddlewareDemo);
console.log('[Middleware] Type-aware demo registered');

console.log('[Test] All components initialized!');