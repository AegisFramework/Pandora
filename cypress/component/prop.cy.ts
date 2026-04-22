/**
 * Tests for @Attribute and @Property — the two decorators that expose a
 * Component field through its public surface. @Attribute mirrors the field
 * to a DOM attribute (and observes attribute changes), while @Property is
 * a property-only variant that stays off the DOM. Covers default handling,
 * two-way attribute sync, custom attribute names, boolean/undefined
 * coercion, the `{ render: false }` escape hatch, and @Watch integration.
 */
import { Component, Register, Attribute, Property, Watch, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@Attribute and @Property decorators', () => {
  it('uses the field initializer as the default rendered value', () => {
    const tag = uniqueTag('prop');

    @Register(tag)
    class TestComp extends Component {
      @Attribute() label = 'hello';
      render() {
        return html`<span class="label">${this.label}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .label`).should('have.text', 'hello');
  });

  it('mirrors property assignments to the matching DOM attribute', () => {
    const tag = uniqueTag('prop');

    @Register(tag)
    class TestComp extends Component {
      @Attribute() label = 'init';
      render() {
        return html`<span class="label">${this.label}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).label = 'updated';
    });
    cy.wait(50);
    cy.get(tag).should('have.attr', 'label', 'updated');
    cy.get(`${tag} .label`).should('have.text', 'updated');
  });

  it('reflects setAttribute calls back into the property value', () => {
    const tag = uniqueTag('prop');

    @Register(tag)
    class TestComp extends Component {
      @Attribute() label = 'init';
      render() {
        return html`<span class="label">${this.label}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      $el[0].setAttribute('label', 'from-attr');
    });
    cy.wait(50);
    cy.get(`${tag} .label`).should('have.text', 'from-attr');
    cy.get(tag).then(($el) => {
      expect(($el[0] as any).label).to.equal('from-attr');
    });
  });

  it('honors a custom attribute name provided to @Attribute', () => {
    const tag = uniqueTag('prop');

    @Register(tag)
    class TestComp extends Component {
      @Attribute('my-label') label = 'default';
      render() {
        return html`<span class="label">${this.label}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).label = 'custom';
    });
    cy.wait(50);
    cy.get(tag).should('have.attr', 'my-label', 'custom');
    cy.get(`${tag} .label`).should('have.text', 'custom');
  });

  it('keeps @Property fields off the DOM attribute surface', () => {
    const tag = uniqueTag('prop');

    @Register(tag)
    class TestComp extends Component {
      @Property() data = 'secret';
      render() {
        return html`<span class="data">${this.data}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).data = 'updated';
    });
    cy.wait(50);
    cy.get(tag).should('not.have.attr', 'data');
  });

  it('removes the attribute when the property is set to undefined', () => {
    const tag = uniqueTag('prop');

    @Register(tag)
    class TestComp extends Component {
      @Attribute() label: string | undefined = 'present';
      render() {
        return html`<span class="label">${this.label ?? 'none'}</span>`;
      }
    }

    cy.mount(tag);
    // The field initializer assigns the raw field and bypasses the setter,
    // so we first assign through the setter to establish the attribute.
    cy.get(tag).then(($el) => {
      ($el[0] as any).label = 'present';
    });
    cy.wait(50);
    cy.get(tag).should('have.attr', 'label', 'present');

    cy.get(tag).then(($el) => {
      ($el[0] as any).label = undefined;
    });
    cy.wait(50);
    cy.get(tag).should('not.have.attr', 'label');
  });

  it('writes an empty attribute for boolean true and removes it for false', () => {
    const tag = uniqueTag('prop');

    @Register(tag)
    class TestComp extends Component {
      @Attribute() active: boolean = false;
      render() {
        return html`<span class="val">${String(this.active)}</span>`;
      }
    }

    cy.mount(tag);
    // Field initializer bypasses the setter, so the attribute starts unset.
    cy.get(tag).should('not.have.attr', 'active');

    cy.get(tag).then(($el) => {
      ($el[0] as any).active = true;
    });
    cy.wait(50);
    cy.get(tag).should('have.attr', 'active', '');

    cy.get(tag).then(($el) => {
      ($el[0] as any).active = false;
    });
    cy.wait(50);
    cy.get(tag).should('not.have.attr', 'active');
  });

  it('skips rendering for { render: false } @Attribute fields while still firing @Watch', () => {
    const tag = uniqueTag('prop');
    let renderCount = 0;
    const watchCalls: string[] = [];

    @Register(tag)
    class TestComp extends Component {
      @Attribute({ render: false }) mode = 'default';

      @Watch('mode')
      onModeChange(newVal: string) { watchCalls.push(newVal); }

      render() {
        renderCount++;
        return html`<span class="mode">${this.mode}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      renderCount = 0;
      ($el[0] as any).mode = 'special';
    });
    cy.wait(50).then(() => {
      expect(renderCount).to.equal(0);
      expect(watchCalls).to.deep.equal(['special']);
    });
  });

  it('treats @Property assignments as non-rendering and non-reflected', () => {
    const tag = uniqueTag('prop');
    let renderCount = 0;

    @Register(tag)
    class TestComp extends Component {
      @Property() data: any = null;

      render() {
        renderCount++;
        return html`<span>${this.data}</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      renderCount = 0;
      ($el[0] as any).data = { key: 'value' };
    });
    cy.wait(50).then(() => {
      expect(renderCount).to.equal(0);
    });
    cy.get(tag).should('not.have.attr', 'data');
  });

  it('derives the attribute name from the field name when none is supplied', () => {
    const tag = uniqueTag('prop');

    @Register(tag)
    class TestComp extends Component {
      @Attribute() label = 'hello';
      render() { return html`<span class="label">${this.label}</span>`; }
    }

    cy.mount(tag);
    cy.get(`${tag} .label`).should('have.text', 'hello');
    cy.get(tag).should('have.attr', 'label', 'hello');
  });
});
