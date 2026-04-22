/**
 * Tests for @Listen — the decorator that binds a method as a DOM event
 * listener on the Component (or a descendant selected by `target`). Covers
 * host-bound listeners, `{ once: true }`, shadow-root selector targets,
 * survival across rerenders that replace the selector target, and the
 * container-component case where render() is inherited and children come
 * from pre-existing markup.
 */
import { Component, ShadowComponent, Register, State, Listen, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@Listen decorator', () => {
  it('binds the handler to the component host for the configured event', () => {
    const tag = uniqueTag('listen');

    @Register(tag)
    class TestComp extends Component {
      clicked = false;

      @Listen('click')
      onClick() {
        this.clicked = true;
      }

      render() {
        return html`<span class="target">click me</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).click();
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).clicked).to.be.true;
    });
  });

  it('invokes the handler at most once when { once: true } is set', () => {
    const tag = uniqueTag('listen');

    @Register(tag)
    class TestComp extends Component {
      count = 0;

      @Listen('click', { once: true })
      onClick() {
        this.count++;
      }

      render() {
        return html`<span class="target">click me</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).click();
    cy.get(tag).click();
    cy.wait(50);
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).count).to.equal(1);
    });
  });

  it('delegates events for selector targets inside a ShadowComponent root', () => {
    const tag = uniqueTag('listen');

    @Register(tag)
    class TestComp extends ShadowComponent {
      clicked = false;

      @Listen('click', { target: '.inner' })
      onInnerClick() {
        this.clicked = true;
      }

      render() {
        return html`<div class="inner">click inner</div>`;
      }
    }

    cy.mount(tag);
    // _attachListeners runs after _render so .inner exists on the first mount.
    cy.get(tag).then(($el) => {
      const inner = ($el[0] as any).shadowRoot.querySelector('.inner') as HTMLElement;
      inner.click();
    });
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).clicked).to.be.true;
    });
  });

  it('keeps the selector target wired after a rerender replaces the matching node', () => {
    const tag = uniqueTag('listen');

    @Register(tag)
    class TestComp extends Component {
      @State() version = 1;
      clickCount = 0;

      @Listen('click', { target: '.target' })
      onTargetClick() {
        this.clickCount++;
      }

      render() {
        // A plain-string render fully replaces the host's inner DOM on each call.
        return `<div class="target">v${this.version}</div>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .target`).click();
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).clickCount).to.equal(1);
    });
    // Bumping version triggers a rerender that swaps the .target node.
    cy.get(tag).then(($el) => {
      ($el[0] as any).version = 2;
    });
    cy.wait(50);
    cy.get(`${tag} .target`).should('have.text', 'v2');
    // The new node should still route clicks to the handler.
    cy.get(`${tag} .target`).click();
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).clickCount).to.equal(2);
    });
  });

  it('attaches listeners for container components that inherit render()', () => {
    const tag = uniqueTag('listen');

    @Register(tag)
    class TestComp extends Component {
      clicked = 0;

      @Listen('click')
      onClick() { this.clicked++; }

      // No render() override — the component relies on pre-existing HTML children.
    }

    cy.then(() => {
      const root = document.querySelector('[data-cy-root]')!;
      const el = document.createElement(tag);
      el.innerHTML = '<button class="target">click me</button>';
      root.appendChild(el);
    });
    cy.wait(50);
    cy.get(`${tag} .target`).click();
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).clicked).to.equal(1);
    });
  });
});
