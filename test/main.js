const { Component, ShadowComponent, Registry } = Pandora;

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
// Counter Component
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

console.log('[Test] All components initialized!');