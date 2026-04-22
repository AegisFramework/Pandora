/**
 * Covers the render pipeline: what each return type means (void, empty
 * string, nothing), how batch() coalesces @State writes into a single
 * render and defers @Watch callbacks, plus the ready() and forceRender()
 * escape hatches. Several specs use cy.wait() to let the microtask-scheduled
 * render flush before asserting.
 */
import { Component, Register, State, Watch, html, nothing } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('Render and batching', () => {
  it('leaves children untouched when render() returns void', () => {
    const tag = uniqueTag('render');

    @Register(tag)
    class TestComp extends Component {
      // No render() override, so the default void return is a pure no-op.
    }

    cy.mount(tag, '<div class="child">preserved</div>');
    cy.get(`${tag} .child`).should('have.text', 'preserved');
  });

  it('clears the DOM when render() returns an empty string', () => {
    const tag = uniqueTag('render');

    @Register(tag)
    class TestComp extends Component {
      @State() show = true;

      render() {
        if (!this.show) return '';
        return html`<span class="content">visible</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .content`).should('exist');

    cy.get(tag).then(($el) => {
      ($el[0] as any).show = false;
    });
    cy.wait(50);
    cy.get(tag).then(($el) => {
      expect($el[0].innerHTML.trim()).to.equal('');
    });
  });

  it('clears the DOM when render() returns lit-html nothing', () => {
    const tag = uniqueTag('render');

    @Register(tag)
    class TestComp extends Component {
      @State() show = true;

      render() {
        if (!this.show) return nothing;
        return html`<span class="content">visible</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .content`).should('exist');

    cy.get(tag).then(($el) => {
      ($el[0] as any).show = false;
    });
    cy.wait(50);
    cy.get(`${tag} .content`).should('not.exist');
  });

  it('skips the initial render when @State only sets defaults, so light-DOM children survive', () => {
    const tag = uniqueTag('render');

    @Register(tag)
    class ContainerComp extends Component {
      @State() open = false;

      render() {
        return `<div class="shell"><slot></slot></div>`;
      }
    }

    cy.mount(tag, '<span class="child">inner</span>');
    // If the default-value assignment triggered a render, the light-DOM child would be wiped.
    cy.wait(100);
    cy.get(`${tag} .child`).should('have.text', 'inner');
  });

  it('defers @Watch callbacks until the batch closes, preserving assignment order', () => {
    const tag = uniqueTag('render');
    const watchCalls: Array<[string, unknown]> = [];

    @Register(tag)
    class TestComp extends Component {
      @State() x = 0;
      @State() y = 0;
      @State() z = 0;

      @Watch('x') onX(n: number) { watchCalls.push(['x', n]); }
      @Watch('y') onY(n: number) { watchCalls.push(['y', n]); }
      @Watch('z') onZ(n: number) { watchCalls.push(['z', n]); }

      render() {
        return html`<span>${this.x}-${this.y}-${this.z}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      watchCalls.length = 0;
      const comp = $el[0] as any;
      comp.batch(() => {
        comp.x = 1;
        comp.y = 2;
        comp.z = 3;
      });
    });
    cy.wait(10).then(() => {
      expect(watchCalls).to.deep.equal([['x', 1], ['y', 2], ['z', 3]]);
    });
  });

  it('collapses A -> B -> A assignments so neither @Watch nor didChange fire', () => {
    const tag = uniqueTag('render');
    const watchCalls: unknown[] = [];
    const didChangeCalls: Array<[string, unknown, unknown]> = [];

    @Register(tag)
    class TestComp extends Component {
      @State() x = 0;

      @Watch('x') onX(n: unknown) { watchCalls.push(n); }

      didChange(prop: string, oldV: unknown, newV: unknown) {
        didChangeCalls.push([prop, oldV, newV]);
      }

      render() {
        return html`<span>${this.x}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      watchCalls.length = 0;
      didChangeCalls.length = 0;
      const comp = $el[0] as any;
      comp.batch(() => {
        comp.x = 1;
        comp.x = 0;
      });
    });
    cy.wait(10).then(() => {
      expect(watchCalls, 'watcher should not fire for net no-op').to.deep.equal([]);
      expect(didChangeCalls, 'didChange should not fire for net no-op').to.deep.equal([]);
    });
  });

  it('coalesces all writes inside a batch into a single render pass', () => {
    const tag = uniqueTag('render');
    let renderCount = 0;

    @Register(tag)
    class TestComp extends Component {
      @State() a = 0;
      @State() b = 0;

      render() {
        renderCount++;
        return html`<span>${this.a}-${this.b}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      renderCount = 0;
      const comp = $el[0] as any;
      comp.batch(() => {
        comp.a = 10;
        comp.b = 20;
      });
    });
    cy.wait(50).then(() => {
      expect(renderCount).to.equal(1);
    });
  });

  it('invokes ready() callbacks after the component mounts', () => {
    const tag = uniqueTag('render');
    let readyFired = false;

    @Register(tag)
    class TestComp extends Component {
      render() { return html`<span>ready</span>`; }
    }

    cy.then(() => {
      const root = document.querySelector('[data-cy-root]')!;
      const el = document.createElement(tag) as any;
      // Register the callback before insertion to prove it fires once the element connects.
      el.ready(() => {
        readyFired = true;
      });
      root.appendChild(el);
    });
    cy.wait(100).then(() => {
      expect(readyFired).to.be.true;
    });
  });

  it('runs ready() synchronously when the component is already mounted', () => {
    const tag = uniqueTag('render');
    let readyFired = false;

    @Register(tag)
    class TestComp extends Component {
      render() { return html`<span>ready</span>`; }
    }

    cy.mount(tag).then((el) => {
      (el as any).ready(() => {
        readyFired = true;
      });
    });
    cy.wait(10).then(() => {
      expect(readyFired).to.be.true;
    });
  });

  it('flushes pending updates synchronously when forceRender() is called', () => {
    const tag = uniqueTag('render');

    @Register(tag)
    class TestComp extends Component {
      value = 'initial';

      render() {
        return html`<span class="value">${this.value}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .value`).should('have.text', 'initial');

    cy.get(tag).then(($el) => {
      const comp = $el[0] as any;
      // `value` is a plain field, so we need forceRender() to push the change through.
      comp.value = 'updated';
      comp.forceRender();
    });
    cy.wait(50);
    cy.get(`${tag} .value`).should('have.text', 'updated');
  });
});
