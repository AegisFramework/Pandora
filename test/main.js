const { Component, ShadowComponent, Registry, html, nothing } = Pandora;

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

// NOTE: Registry.use('props', ...) and Registry.use('state', ...) have been removed.
// Only Registry.use('render', ...) is supported in the new API.

// ==========================================
// Basic Component
// ==========================================
class CustomElement extends Component {
	// Plain class field instead of this.props = { text: '' }
	text = '';

	render() {
		return `<h2>${this.text}</h2>`;
	}
}

Registry.register('custom-element', CustomElement);

const element = document.querySelector('custom-element');

// Instead of element.setProps({ text: 'Hello World!' }),
// set the field directly and trigger a re-render
element.text = 'Hello World!';
element.forceRender();
element.setStyle({
	h2: { color: '#222' },
	'&:nth-child(4) h2': { color: '#f75c5f' }
});

// ==========================================
// Shadow DOM Component
// ==========================================
class CustomShadowElement extends ShadowComponent {
	text = '';

	render() {
		return `<h2>${this.text}</h2>`;
	}
}

Registry.register('custom-shadow-element', CustomShadowElement);

const shadowElement = document.querySelector('custom-shadow-element');

shadowElement.text = 'Shadow DOM!';
shadowElement.forceRender();
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
	count = 0;

	increment() {
		this.count++;
		this.forceRender();
		this.emit('count-changed', { count: this.count });
	}

	decrement() {
		this.count--;
		this.forceRender();
		this.emit('count-changed', { count: this.count });
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

	render() {
		return `
			<div class="counter">
				<button class="decrement">-</button>
				<span class="count">${this.count}</span>
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
	count = 0;

	increment() {
		this.count++;
		this.forceRender();
	}

	decrement() {
		this.count--;
		this.forceRender();
	}

	render() {
		// Using lit-html for efficient DOM updates
		return html`
			<div class="counter">
				<button class="decrement" @click=${() => this.decrement()}>-</button>
				<span class="count">${this.count}</span>
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
	expanded = false;

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
		this.expanded = !this.expanded;
		this.forceRender();
	}

	render() {
		return html`
			<div class="header">Shadow Card (lit-html)</div>
			<div class="content">
				${this.expanded
					? html`<p>Expanded content with more details!</p>`
					: nothing
				}
			</div>
			<button @click=${() => this.toggle()}>
				${this.expanded ? 'Collapse' : 'Expand'}
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
	theme = Registry.getState('theme') || 'light';

	didMount() {
		this._unsubscribe = Registry.subscribe('theme', (newTheme) => {
			this.theme = newTheme;
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
		const newTheme = this.theme === 'light' ? 'dark' : 'light';
		Registry.setState('theme', newTheme);
	}

	render() {
		return `
			<button class="theme-btn" onclick="this.closest('theme-toggle').toggleTheme()">
				Theme: ${this.theme}
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

	// Default values as class fields
	message = 'Default message';
	status = 'idle';

	attributeChangedCallback(property, oldValue, newValue) {
		console.log(`[AttributeWatcher] ${property}: ${oldValue} -> ${newValue}`);

		// Sync the class field from the attribute
		if (property === 'message') {
			this.message = newValue || 'Default message';
		} else if (property === 'status') {
			this.status = newValue || 'idle';
		}

		if (this.isReady) {
			this.forceRender();
		}
	}

	render() {
		return `
			<div class="attribute-watcher">
				<p>Message: ${this.message}</p>
				<p>Status: ${this.status}</p>
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
	clicked = false;

	didMount() {
		this.once('click', () => {
			this.clicked = true;
			this.forceRender();
			console.log('[OnceDemo] Clicked! (will not fire again)');
		});

		return Promise.resolve();
	}

	render() {
		return `
			<button class="once-btn">
				${this.clicked ? 'Already clicked once!' : 'Click me (once only)'}
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
	// Set attributes for simple values
	navigation.setAttribute('logo', 'https://aegisframework.com/assets/images/aegis.svg');

	// Items is a complex value (array), set as a property and re-render
	navigation.items = [
		{ text: 'Home', link: '#' },
		{ text: 'Features', link: '#features' },
		{ text: 'Demo', link: '#demo' },
		{ text: 'Docs', link: '#docs' }
	];
	navigation.forceRender();
}

// ==========================================
// Decorator-equivalent tests (non-decorator path)
// ==========================================

// Test Register: just use Registry.register() directly
class DecoratedComponent extends Component {
	render() {
		return html`<div class="decorated">Registered via Registry.register()!</div>`;
	}
}
Registry.register('decorated-component', DecoratedComponent);

console.log('[Register] decorated-component registered');
console.log('[Register] Has component:', Registry.has('decorated-component'));

// Test Consumer pattern (manual subscribe to global state)
Registry.setState('app.message', 'Hello from global state!');

class ConsumerDemo extends Component {
	message = Registry.getState('app.message') || 'No message';

	didMount() {
		this._unsubscribe = Registry.subscribe('app.message', (newVal) => {
			this.message = newVal || 'No message';
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

	render() {
		return html`<div class="consumer-demo">${this.message}</div>`;
	}
}
Registry.register('consumer-demo', ConsumerDemo);

console.log('[Consumer] consumer-demo registered');

// Test updating global state updates Consumer components
setTimeout(() => {
	Registry.setState('app.message', 'Updated message!');
	console.log('[Consumer] Global state updated, components should re-render');
}, 2000);

// Test Prop pattern (read from attributes)
class PropDemo extends Component {
	static observedAttributes = ['label', 'custom-attr'];

	label = '';
	customValue = '';

	attributeChangedCallback(property, oldValue, newValue) {
		if (property === 'label') {
			this.label = newValue || '';
		} else if (property === 'custom-attr') {
			this.customValue = newValue || '';
		}

		if (this.isReady) {
			this.forceRender();
		}
	}

	didMount() {
		// Initialize from attributes on first mount
		this.label = this.getAttribute('label') || '';
		this.customValue = this.getAttribute('custom-attr') || '';
		return Promise.resolve();
	}

	render() {
		return html`
			<div class="prop-demo">
				<p>Label: ${this.label}</p>
				<p>Custom: ${this.customValue}</p>
			</div>
		`;
	}
}
Registry.register('prop-demo', PropDemo);

console.log('[Prop] prop-demo registered');

// ==========================================
// Static Template with lit-html
// ==========================================
class StaticLitTemplate extends Component {
	title = 'Static lit-html';
}

// Set static template as property assignment (not method call)
StaticLitTemplate.template = (ctx) => html`
	<div class="static-lit-demo">
		<h4>${ctx.title}</h4>
		<button @click=${() => {
			ctx.title = 'Clicked!';
			ctx.forceRender();
		}}>Update Title</button>
	</div>
`;

Registry.register('static-lit-template', StaticLitTemplate);
console.log('[Static Template] lit-html template registered');

// ==========================================
// Async Static Template
// ==========================================
class AsyncStaticTemplate extends Component {
	loaded = false;
}

// Set async static template as property assignment
AsyncStaticTemplate.template = async (ctx) => {
	if (!ctx.loaded) {
		// Simulate async data fetch
		await new Promise(resolve => setTimeout(resolve, 800));
		ctx.loaded = true;
	}
	return html`
		<div class="async-template-demo">
			${ctx.loaded ? 'Async template loaded!' : 'Loading...'}
		</div>
	`;
};

Registry.register('async-static-template', AsyncStaticTemplate);
console.log('[Async Static Template] Registered');

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
// Async Render Demo
// ==========================================
class AsyncRenderDemo extends Component {
	loading = true;
	data = null;

	async render() {
		if (this.loading) {
			// Simulate async data fetch
			await new Promise(resolve => setTimeout(resolve, 1000));
			this.data = { message: 'Data loaded!' };
			this.loading = false;
		}

		return html`
			<div class="async-demo">
				${this.loading
					? html`<span>Loading...</span>`
					: html`<span>${this.data.message}</span>`
				}
			</div>
		`;
	}
}

Registry.register('async-render-demo', AsyncRenderDemo);
console.log('[Async Render] Demo component registered');

// ==========================================
// Type-Aware Middleware Demo
// ==========================================
Registry.use('render', (component, value, renderType) => {
	if (component.constructor.tag === 'middleware-demo') {
		console.log(`[Middleware] render type: ${renderType}`, typeof value);
	}
	return value;
});

class MiddlewareDemo extends Component {
	useLit = true;

	render() {
		// Toggle between string and lit-html to test middleware
		if (this.useLit) {
			return html`<div class="middleware-demo">Using lit-html (renderType: lit)</div>`;
		}
		return '<div class="middleware-demo">Using string (renderType: string)</div>';
	}
}

Registry.register('middleware-demo', MiddlewareDemo);
console.log('[Middleware] Type-aware demo registered');

// ==========================================
// reactive() Demo (auto-render without decorators)
// ==========================================
class ReactiveCounter extends Component {
	count = 0;

	willMount() {
		Pandora.Util.reactive(this, 'count', { initialValue: this.count });
	}

	render() {
		return html`
			<div class="counter">
				<button class="decrement" @click=${() => { this.count--; }}>-</button>
				<span class="count">${this.count}</span>
				<button class="increment" @click=${() => { this.count++; }}>+</button>
			</div>
		`;
	}
}

Registry.register('reactive-counter', ReactiveCounter);
console.log('[reactive()] Counter with auto-render, no decorators');

// ==========================================
// didChange() Demo
// ==========================================
class ChangeLogger extends Component {
	x = 0;
	y = 0;
	log = [];

	willMount() {
		Pandora.Util.reactive(this, 'x', { initialValue: 0 });
		Pandora.Util.reactive(this, 'y', { initialValue: 0 });
		Pandora.Util.reactive(this, 'log', { initialValue: [] });
	}

	didChange(property, oldValue, newValue) {
		if (property === 'x' || property === 'y') {
			this.log = [...this.log, `${property}: ${oldValue} → ${newValue}`].slice(-5);
		}
	}

	render() {
		return html`
			<div>
				<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
					<button @click=${() => { this.x++; }}>x++</button>
					<button @click=${() => { this.y++; }}>y++</button>
				</div>
				<p style="margin:0">x=${this.x}, y=${this.y}</p>
				<ul style="margin:0.5rem 0;padding-left:1.5rem;font-size:0.85rem;color:#666;">
					${this.log.map(entry => html`<li>${entry}</li>`)}
				</ul>
			</div>
		`;
	}
}

Registry.register('change-logger', ChangeLogger);
console.log('[didChange] Logger demo registered');

// ==========================================
// ready() Demo
// ==========================================
class ReadyDemo extends Component {
	message = 'Waiting...';

	willMount() {
		Pandora.Util.reactive(this, 'message', { initialValue: this.message });
	}

	render() {
		return html`<p style="margin:0">${this.message}</p>`;
	}
}

Registry.register('ready-demo', ReadyDemo);

function createReadyElement() {
	const el = document.createElement('ready-demo');
	el.ready(() => {
		el.message = 'ready() fired!';
	});
	const container = document.querySelector('.ready-container');
	container.innerHTML = '';
	container.appendChild(el);
}

window.createReadyElement = createReadyElement;
console.log('[ready()] Demo registered');

// ==========================================
// batch() Demo
// ==========================================
class BatchDemo extends Component {
	x = 0;
	y = 0;
	z = 0;
	watchLog = [];

	willMount() {
		Pandora.Util.reactive(this, 'x', { initialValue: 0 });
		Pandora.Util.reactive(this, 'y', { initialValue: 0 });
		Pandora.Util.reactive(this, 'z', { initialValue: 0 });
		Pandora.Util.reactive(this, 'watchLog', { initialValue: [] });
	}

	didChange(property, oldValue, newValue) {
		if (property !== 'watchLog') {
			this.watchLog = [...this.watchLog, `${property}: ${oldValue}→${newValue}`].slice(-6);
		}
	}

	render() {
		return html`
			<div>
				<p style="margin:0 0 0.5rem">x=${this.x}, y=${this.y}, z=${this.z}</p>
				<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
					<button @click=${() => {
						this.x++;
						this.y++;
						this.z++;
					}}>Without batch (3 didChange)</button>
					<button @click=${() => {
						this.batch(() => {
							this.x++;
							this.y++;
							this.z++;
						});
					}}>With batch (deferred)</button>
				</div>
				<ul style="margin:0;padding-left:1.5rem;font-size:0.85rem;color:#666;">
					${this.watchLog.map(entry => html`<li>${entry}</li>`)}
				</ul>
			</div>
		`;
	}
}

Registry.register('batch-demo', BatchDemo);
console.log('[batch()] Demo registered');

// ==========================================
// Container Component (void render preserves children)
// ==========================================
class ContainerDemo extends Component {
	// No render() override → returns void → children preserved
}

Registry.register('container-demo', ContainerDemo);
console.log('[Container] void render demo registered');

// ==========================================
// Typed State Demo
// ==========================================
// Note: createState is available via Pandora.createState in browser bundle
// For the demo, we'll use Registry directly since browser bundle may not export createState
Registry.setState('app.score', 0);

class ScoreDisplay extends Component {
	score = 0;

	didMount() {
		this._unsub = Registry.subscribe('app.score', (newVal) => {
			this.score = newVal;
			this.forceRender();
		});
		this.score = Registry.getState('app.score') || 0;
	}

	willUnmount() {
		if (this._unsub) this._unsub();
	}

	render() {
		return html`<span style="font-size:1.5rem;font-weight:bold">${this.score}</span>`;
	}
}

Registry.register('score-display', ScoreDisplay);

function incrementScore() {
	const current = Registry.getState('app.score') || 0;
	Registry.setState('app.score', current + 10);
}

window.incrementScore = incrementScore;
console.log('[TypedState] Score display demo registered');

// ==========================================
// @ClassList Demo (using prototype pattern without decorators)
// ==========================================
class ClassListDemo extends Component {
	willMount() {
		Pandora.Util.reactive(this, 'active', { initialValue: false });
		Pandora.Util.reactive(this, 'highlighted', { initialValue: false });
	}

	didChange(prop) {
		if (prop === 'active') {
			this.classList.toggle('demo-active', this.active);
		}
		if (prop === 'highlighted') {
			this.classList.toggle('demo-highlighted', this.highlighted);
		}
	}

	render() {
		return html`
			<div style="display:flex;gap:0.5rem;">
				<button @click=${() => { this.active = !this.active; }}>
					Toggle Active (${this.active ? 'ON' : 'OFF'})
				</button>
				<button @click=${() => { this.highlighted = !this.highlighted; }}>
					Toggle Highlight (${this.highlighted ? 'ON' : 'OFF'})
				</button>
			</div>
		`;
	}
}

Registry.register('classlist-demo', ClassListDemo);
console.log('[ClassList] Demo registered');

// ==========================================
// Lifecycle Events Demo
// ==========================================
class LifecycleEventDemo extends Component {
	render() {
		return html`<span>Lifecycle Event Component</span>`;
	}
}

Registry.register('lifecycle-event-demo', LifecycleEventDemo);

function addLifecycleComponent() {
	const container = document.querySelector('.lifecycle-event-container');
	const el = document.createElement('lifecycle-event-demo');
	container.appendChild(el);
}

function removeLifecycleComponent() {
	const container = document.querySelector('.lifecycle-event-container');
	const el = container.querySelector('lifecycle-event-demo');
	if (el) el.remove();
}

// Listen for lifecycle events on the container
document.querySelector('.lifecycle-event-container')?.addEventListener('pandora:ready', (e) => {
	const log = document.querySelector('.lifecycle-event-log');
	if (log) log.textContent += `ready (${e.detail.tag}) | `;
});

document.querySelector('.lifecycle-event-container')?.addEventListener('pandora:unmount', (e) => {
	const log = document.querySelector('.lifecycle-event-log');
	if (log) log.textContent += `unmount (${e.detail.tag}) | `;
});

window.addLifecycleComponent = addLifecycleComponent;
window.removeLifecycleComponent = removeLifecycleComponent;
console.log('[Lifecycle Events] Demo registered');

// ==========================================
// Shadow Slot Demo
// ==========================================
class SlotDemo extends ShadowComponent {
	willMount() {
		this.setStyle({
			':host': { display: 'block', border: '1px dashed #999', padding: '0.5rem', borderRadius: '4px' },
			'.wrapper': { display: 'flex', gap: '1rem' },
			'.sidebar': { background: '#f0f0f0', padding: '0.5rem', borderRadius: '4px', minWidth: '80px' },
			'.main': { flex: '1' }
		});
	}

	render() {
		return html`
			<div class="wrapper">
				<div class="sidebar"><slot name="sidebar">Default sidebar</slot></div>
				<div class="main"><slot>Default content</slot></div>
			</div>
		`;
	}
}

Registry.register('slot-demo', SlotDemo);
console.log('[Slot] Shadow slot demo registered');

console.log('[Test] All components initialized!');
