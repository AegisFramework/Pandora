/**
 * Verifies that the @Style decorator attaches scoped CSS to both light-DOM
 * Components (where :host is rewritten to the tag selector) and
 * ShadowComponents (where :host is honored natively by the shadow root).
 */
import { Component, ShadowComponent, Register, Style, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@Style decorator', () => {
  it('rewrites :host to the tag selector for light-DOM components', () => {
    const tag = uniqueTag('style');

    @Style({ ':host': { display: 'block' } })
    @Register(tag)
    class TestComp extends Component {
      render() {
        return html`<span>styled</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).should('have.css', 'display', 'block');
  });

  it('scopes styles to the shadow root for ShadowComponent subclasses', () => {
    const tag = uniqueTag('style');

    @Style({ ':host': { display: 'flex' } })
    @Register(tag)
    class TestComp extends ShadowComponent {
      render() {
        return html`<span>shadow styled</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).should('have.css', 'display', 'flex');
  });

  it('merges object-form setStyle calls across light-DOM instances of the same component', () => {
    const tag = uniqueTag('style');

    @Register(tag)
    class TestComp extends Component {
      render(): void {}
    }

    cy.then(() => {
      const root = document.querySelector('[data-cy-root]')!;
      root.innerHTML = `<${tag}></${tag}><${tag}></${tag}>`;
    });

    cy.get(tag).should('have.length', 2);
    cy.get(tag).then(($els) => {
      ($els[0] as unknown as TestComp).setStyle({ '.one': { color: 'red' } });
      ($els[1] as unknown as TestComp).setStyle({ '.two': { color: 'blue' } });

      const rules = Array.from(document.adoptedStyleSheets)
        .flatMap(sheet => Array.from(sheet.cssRules))
        .map(rule => rule.cssText)
        .join('\n');

      expect(rules).to.include(`${tag} .one`);
      expect(rules).to.include(`${tag} .two`);
    });
  });

  it('merges object-form setStyle calls across shadow instances of the same component', () => {
    const tag = uniqueTag('style');

    @Register(tag)
    class TestComp extends ShadowComponent {
      render(): void {}
    }

    cy.then(() => {
      const root = document.querySelector('[data-cy-root]')!;
      root.innerHTML = `<${tag}></${tag}><${tag}></${tag}>`;
    });

    cy.get(tag).should('have.length', 2);
    cy.get(tag).then(($els) => {
      ($els[0] as unknown as TestComp).setStyle({ '.one': { color: 'red' } });
      ($els[1] as unknown as TestComp).setStyle({ '.two': { color: 'blue' } });

      const rules = Array.from(($els[0] as unknown as TestComp).shadowRoot.adoptedStyleSheets[0].cssRules)
        .map(rule => rule.cssText)
        .join('\n');

      expect(rules).to.include('.one');
      expect(rules).to.include('.two');
    });
  });
});
