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
});
