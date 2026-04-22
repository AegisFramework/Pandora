/**
 * Verifies the @Emitter decorator, which installs a method that dispatches a
 * CustomEvent whose type matches the decorator argument. Default options
 * should bubble so ancestor listeners pick the event up.
 */
import { Component, Register, Emitter, html } from '../../src/index';
import { uniqueTag } from '../support/component';

describe('@Emitter decorator', () => {
  it('dispatches a CustomEvent with the decorator name and forwarded detail payload', () => {
    const tag = uniqueTag('emitter');
    const received: Array<{ name: string; detail: unknown }> = [];

    @Register(tag)
    class TestComp extends Component {
      @Emitter('my-event') fire!: (detail?: unknown) => boolean;

      render() {
        return html`<span>emitter</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      const el = $el[0];
      el.addEventListener('my-event', ((e: CustomEvent) => {
        received.push({ name: e.type, detail: e.detail });
      }) as EventListener);
      (el as any).fire({ msg: 'hello' });
    });
    cy.wait(10).then(() => {
      expect(received).to.have.length(1);
      expect(received[0].name).to.equal('my-event');
      expect(received[0].detail).to.deep.equal({ msg: 'hello' });
    });
  });

  it('emits bubbling events so ancestor listeners on document receive them', () => {
    const tag = uniqueTag('emitter');
    let bubbled = false;

    @Register(tag)
    class TestComp extends Component {
      @Emitter('bubble-event') fire!: (detail?: unknown) => boolean;

      render() {
        return html`<span>emitter</span>`;
      }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      document.addEventListener('bubble-event', () => {
        bubbled = true;
      }, { once: true });
      (($el[0]) as any).fire('data');
    });
    cy.wait(10).then(() => {
      expect(bubbled).to.be.true;
    });
  });
});
