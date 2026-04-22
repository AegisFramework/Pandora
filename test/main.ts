/// <reference types="./../dist/types/index.d.ts" />
import {
  Component, ShadowComponent, Registry,
  Register, State, Attribute, Subscribe, Watch, Query, QueryAll,
  Listen, Emitter, Style,
  html, nothing
} from './../dist/pandora.js';

// ==========================================
// Basic Component with @State
// ==========================================

@Register('test-counter')
class TestCounter extends Component {
  @State() count = 0;

  @Listen('click')
  increment() {
    this.count++;
  }

  render() {
    return html`<button>Count: ${this.count}</button>`;
  }
}

// ==========================================
// Component with @Attribute and @Watch
// ==========================================

@Register('test-greeter')
class TestGreeter extends Component {
  @Attribute() name = 'World';
  @Attribute('max-length') maxLength = 100;

  @Watch('name')
  onNameChange(newVal: string, oldVal: string) {
    console.log(`Name changed: ${oldVal} -> ${newVal}`);
  }

  render() {
    return html`<h2>Hello, ${this.name}!</h2>`;
  }
}

// ==========================================
// Component with @State({ render: false }) + @Watch
// ==========================================

@Register('test-player')
class TestPlayer extends Component {
  @State() track = 'Song A';
  @State({ render: false }) volume = 50;

  @Query('.volume-display') volumeDisplay!: HTMLSpanElement;

  @Watch('volume')
  onVolumeChange(newVal: number) {
    if (this.isReady) {
      this.volumeDisplay.textContent = `Vol: ${newVal}`;
    }
  }

  render() {
    return html`
      <div>Playing: ${this.track}</div>
      <span class="volume-display">Vol: ${this.volume}</span>
      <button @click=${() => { this.volume = Math.min(100, this.volume + 10); }}>Vol+</button>
    `;
  }
}

// ==========================================
// Component with @Subscribe
// ==========================================

Registry.setState('app.theme', 'light');

@Register('test-themed')
class TestThemed extends Component {
  @Subscribe('app.theme') theme!: string;

  render() {
    return html`<div class="theme-${this.theme}">Theme: ${this.theme}</div>`;
  }
}

// ==========================================
// Component with @Style
// ==========================================

@Register('test-styled')
@Style({
  ':host': { display: 'block', padding: '16px' },
  h3: { color: 'blue' }
})
class TestStyled extends Component {
  @Attribute() title = 'Styled';

  render() {
    return html`<h3>${this.title}</h3>`;
  }
}

// ==========================================
// Component with @Emitter
// ==========================================

@Register('test-emitter')
class TestEmitter extends Component {
  @Emitter('item-select') emitSelect!: (detail: { id: number }) => boolean;

  render() {
    return html`<button @click=${() => this.emitSelect({ id: 42 })}>Select</button>`;
  }
}

// ==========================================
// Component without decorators (plain JS style)
// ==========================================

class PlainCounter extends Component {
  count = 0;

  async didMount() {
    this.on('click', () => {
      this.count++;
      this.forceRender();
    });
  }

  render() {
    return html`<button>Plain: ${this.count}</button>`;
  }
}

Registry.register('plain-counter', PlainCounter);

// ==========================================
// Log results
// ==========================================

console.log('Registered components:', Registry.list());
console.log('All tests loaded successfully.');
