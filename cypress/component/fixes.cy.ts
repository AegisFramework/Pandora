/**
 * Regression guards for bugs found and fixed during the library review:
 *
 *  - evolve()/lazy() now apply the new/real class's field defaults to live
 *    instances (the default-capturing temp construct no longer throws).
 *  - @Listen({ once: true }) fires at most once per connection, even when the
 *    component re-renders between events.
 *  - render() may switch between string and lit-html output without crashing.
 *  - @Style is applied once per class, so a runtime setStyle() merge survives a
 *    later instance mounting.
 *  - Attribute coercion is round-trip-safe (no NaN / parseInt truncation /
 *    leading-zero loss).
 */
import {
  Component, ShadowComponent, Registry, Register,
  State, Attribute, Listen, Style, html,
} from '../../src/index';
import { uniqueTag } from '../support/component';

describe('regression: evolve()/lazy() apply new-class field defaults', () => {
  it('evolve(rerender) migrates a NEW plain-field default to live instances', () => {
    const tag = uniqueTag('rg-evolve');
    class V1 extends Component { render() { return html`<span class="v">v1</span>`; } }
    Registry.register(tag, V1 as any);

    cy.mount(tag);
    cy.get(`${tag} .v`).should('have.text', 'v1');

    cy.then(() => {
      class V2 extends Component {
        plainField = 'from-v2';
        render() { return html`<span class="v">${(this as any).plainField ?? 'MISSING'}</span>`; }
      }
      Registry.evolve(tag, V2 as any, true);
    });
    cy.get(`${tag} .v`).should('have.text', 'from-v2');
  });

  it('evolve(rerender) seeds a NEW @State default without a console warning', () => {
    const tag = uniqueTag('rg-evolve');
    const warnings: string[] = [];
    const orig = console.warn;

    class V1 extends Component { render() { return html`<span class="v">v1</span>`; } }
    Registry.register(tag, V1 as any);

    cy.mount(tag);
    cy.then(() => {
      console.warn = (...a: any[]) => { warnings.push(a.map(String).join(' ')); orig.apply(console, a); };
      class V2 extends Component {
        @State() n = 7;
        render() { return html`<span class="v">v2-${this.n}</span>`; }
      }
      Registry.evolve(tag, V2 as any, true);
    });
    cy.get(`${tag} .v`).should('have.text', 'v2-7');
    cy.then(() => {
      console.warn = orig;
      expect(warnings.some(w => w.includes('Could not construct temp instance')), 'no temp-construct warning').to.be.false;
    });
  });

  it('lazy() applies the real component\'s @State default on first mount', () => {
    const tag = uniqueTag('rg-lazy');
    class Real extends Component {
      @State() label = 'real-default';
      render() { return html`<span class="v">${this.label}</span>`; }
    }
    Registry.lazy(tag, async () => Real as any);

    cy.then(() => {
      document.querySelector('[data-cy-root]')!.innerHTML = `<${tag}></${tag}>`;
    });
    cy.get(`${tag} .v`, { timeout: 10000 }).should('have.text', 'real-default');
  });
});

describe('regression: evolve() re-binds @Listen handlers to the new implementation', () => {
  it('a host listener runs the evolved class\'s handler, not the old one', () => {
    const tag = uniqueTag('rg-evolve-listen');
    const log: string[] = [];

    @Register(tag)
    class V1 extends Component {
      @Listen('click') onClick() { log.push('v1'); }
      render() { return html`<span class="v">v1</span>`; }
    }

    cy.mount(tag);
    cy.get(tag).click();
    cy.then(() => { expect(log).to.deep.equal(['v1']); });

    cy.then(() => {
      class V2 extends Component {
        @Listen('click') onClick() { log.push('v2'); }
        render() { return html`<span class="v">v2</span>`; }
      }
      Registry.evolve(tag, V2 as any, true);
    });
    cy.get(`${tag} .v`).should('have.text', 'v2');
    cy.get(tag).click();
    cy.then(() => { expect(log, 'click after evolve runs the V2 handler').to.deep.equal(['v1', 'v2']); });
  });

  it('attaches a host listener newly declared by the evolved class', () => {
    const tag = uniqueTag('rg-evolve-listen');
    const log: string[] = [];

    @Register(tag)
    class V1 extends Component {
      render() { return html`<span class="v">v1</span>`; } // no @Listen
    }

    cy.mount(tag);
    cy.get(tag).click();
    cy.then(() => { expect(log).to.deep.equal([]); });

    cy.then(() => {
      class V2 extends Component {
        @Listen('click') onClick() { log.push('v2'); }
        render() { return html`<span class="v">v2</span>`; }
      }
      Registry.evolve(tag, V2 as any, true);
    });
    cy.get(`${tag} .v`).should('have.text', 'v2');
    cy.get(tag).click();
    cy.then(() => { expect(log, 'a listener added by the evolved class fires').to.deep.equal(['v2']); });
  });
});

describe('regression: @Listen({ once: true }) is once-per-connection across re-renders', () => {
  it('a host listener fires only once even when the component re-renders between events', () => {
    const tag = uniqueTag('rg-once');
    @Register(tag)
    class C extends Component {
      @State() v = 0;
      count = 0;
      @Listen('click', { once: true })
      onClick() { this.count++; }
      render() { return html`<span class="v">${this.v}</span>`; }
    }

    cy.mount(tag);
    cy.get(tag).click();                                    // fires once
    cy.get(tag).then(($el) => { ($el[0] as any).v = 1; });  // re-render between events
    cy.wait(50);
    cy.get(`${tag} .v`).should('have.text', '1');
    cy.get(tag).click();                                    // must NOT fire again
    cy.wait(20);
    cy.get(tag).then(($el) => { expect(($el[0] as any).count).to.equal(1); });
  });

  it('a window-target once listener survives a re-render and still fires only once', () => {
    const tag = uniqueTag('rg-once');
    @Register(tag)
    class C extends Component {
      @State() v = 0;
      hits = 0;
      @Listen('pandora-rg-evt', { target: 'window', once: true })
      onEvt() { this.hits++; }
      render() { return html`<span class="v">${this.v}</span>`; }
    }

    cy.mount(tag);
    cy.then(() => { window.dispatchEvent(new CustomEvent('pandora-rg-evt')); });   // fires once
    cy.get(tag).then(($el) => { ($el[0] as any).v = 1; });                         // re-render
    cy.wait(50);
    cy.then(() => { window.dispatchEvent(new CustomEvent('pandora-rg-evt')); });   // must NOT fire again
    cy.wait(20);
    cy.get(tag).then(($el) => { expect(($el[0] as any).hits).to.equal(1); });
  });

  it('a delegated once listener fires only once across a re-render', () => {
    const tag = uniqueTag('rg-once');
    @Register(tag)
    class C extends Component {
      @State() v = 0;
      hits = 0;
      @Listen('click', { delegate: '.item', once: true })
      onItem() { this.hits++; }
      render() { return `<button class="item">v${this.v}</button>`; }
    }

    cy.mount(tag);
    cy.get(`${tag} .item`).click();                          // fires once
    cy.get(tag).then(($el) => { ($el[0] as any).v = 1; });   // re-render swaps the button
    cy.wait(50);
    cy.get(`${tag} .item`).should('have.text', 'v1');
    cy.get(`${tag} .item`).click();                          // must NOT fire again
    cy.wait(20);
    cy.get(tag).then(($el) => { expect(($el[0] as any).hits).to.equal(1); });
  });

  it('a non-once selector listener still re-cycles correctly across a re-render', () => {
    const tag = uniqueTag('rg-once');
    @Register(tag)
    class C extends Component {
      @State() v = 1;
      hits = 0;
      @Listen('click', { target: '.t' })
      onT() { this.hits++; }
      render() { return `<div class="t">v${this.v}</div>`; }
    }

    cy.mount(tag);
    cy.get(`${tag} .t`).click();
    cy.get(tag).then(($el) => { expect(($el[0] as any).hits).to.equal(1); ($el[0] as any).v = 2; });
    cy.wait(50);
    cy.get(`${tag} .t`).should('have.text', 'v2');
    cy.get(`${tag} .t`).click();
    cy.get(tag).then(($el) => { expect(($el[0] as any).hits).to.equal(2); });
  });
});

describe('regression: render() can switch between string and lit-html output', () => {
  it('string -> lit -> string transitions render correctly (light DOM)', () => {
    const tag = uniqueTag('rg-mix');
    @Register(tag)
    class C extends Component {
      @State() mode = 'lit';
      render() {
        if (this.mode === 'lit') return html`<span class="out">LIT</span>`;
        return `<span class="out">STR</span>`;
      }
    }

    cy.mount(tag);
    cy.get(`${tag} .out`).should('have.text', 'LIT');
    cy.get(tag).then(($el) => { ($el[0] as any).mode = 'str'; });
    cy.wait(50);
    cy.get(`${tag} .out`).should('have.text', 'STR');
    cy.get(tag).then(($el) => { ($el[0] as any).mode = 'lit'; });
    cy.wait(50);
    cy.get(`${tag} .out`).should('have.text', 'LIT');
    cy.get(tag).then(($el) => { ($el[0] as any).mode = 'str'; });
    cy.wait(50);
    cy.get(`${tag} .out`).should('have.text', 'STR');
  });

  it('lit <-> string transitions render correctly inside a ShadowComponent', () => {
    const tag = uniqueTag('rg-mix-shadow');
    @Register(tag)
    class C extends ShadowComponent {
      @State() mode = 'str';
      render() {
        if (this.mode === 'lit') return html`<span class="out">LIT</span>`;
        return `<span class="out">STR</span>`;
      }
    }

    const readOut = ($el: JQuery<HTMLElement>) =>
      ($el[0] as any).shadowRoot.querySelector('.out').textContent;

    cy.mount(tag);
    cy.get(tag).then(($el) => { expect(readOut($el)).to.equal('STR'); });
    cy.get(tag).then(($el) => { ($el[0] as any).mode = 'lit'; });
    cy.wait(50);
    cy.get(tag).then(($el) => { expect(readOut($el)).to.equal('LIT'); });
    cy.get(tag).then(($el) => { ($el[0] as any).mode = 'str'; });
    cy.wait(50);
    cy.get(tag).then(($el) => { expect(readOut($el)).to.equal('STR'); });
  });
});

describe('regression: @Style is applied once per class', () => {
  it('a runtime setStyle() merge survives a later instance mounting', () => {
    const tag = uniqueTag('rg-style');
    @Style({ ':host': { display: 'block' } })
    @Register(tag)
    class C extends Component { render() { return html`<span>s</span>`; } }

    cy.mount(tag);
    cy.get(tag).then(($el) => {
      ($el[0] as any).setStyle({ ':host': { display: 'block', color: 'rgb(255, 0, 0)' } });
    });
    cy.get(tag).should('have.css', 'color', 'rgb(255, 0, 0)');

    cy.then(() => {
      const el2 = document.createElement(tag);
      el2.className = 'second';
      document.querySelector('[data-cy-root]')!.appendChild(el2);
    });
    cy.get(`${tag}.second`).should(($el) => { expect(($el[0] as any).isReady).to.be.true; });
    cy.get(tag).first().should('have.css', 'color', 'rgb(255, 0, 0)');
  });
});

describe('regression: attribute coercion is round-trip-safe', () => {
  it('coerces clean decimals but preserves ambiguous strings', () => {
    const tag = uniqueTag('rg-coerce');
    @Register(tag)
    class C extends Component {
      @Attribute() v: unknown;
      render() { return html`<span class="t">${typeof this.v}:${String(this.v)}</span>`; }
    }

    const cases: Array<[string, string]> = [
      // Ordinary decimal spellings coerce to numbers, including trailing
      // zeroes ("1.0", "10.00"), a leading "+", and "-0".
      ['42', 'number:42'],
      ['3.14', 'number:3.14'],
      ['0', 'number:0'],
      ['-5', 'number:-5'],
      ['1.0', 'number:1'],
      ['10.00', 'number:10'],
      ['+1', 'number:1'],
      ['-0', 'number:0'],
      // Ambiguous or significant spellings stay strings.
      ['007', 'string:007'],
      ['1e3', 'string:1e3'],
      ['0x10', 'string:0x10'],
      ['Infinity', 'string:Infinity'],
      ['hello', 'string:hello'],
    ];

    cy.mount(tag);
    cases.forEach(([attr, expected]) => {
      cy.get(tag).then(($el) => { $el[0].setAttribute('v', attr); });
      cy.wait(10);
      cy.get(`${tag} .t`).should('have.text', expected);
    });
  });

  it('still coerces empty/true/false attributes to booleans', () => {
    const tag = uniqueTag('rg-coerce');
    @Register(tag)
    class C extends Component {
      @Attribute() flag: unknown;
      render() { return html`<span class="t">${typeof this.flag}:${String(this.flag)}</span>`; }
    }

    cy.mount(tag);
    cy.get(tag).then(($el) => { $el[0].setAttribute('flag', ''); });
    cy.wait(10);
    cy.get(`${tag} .t`).should('have.text', 'boolean:true');
    cy.get(tag).then(($el) => { $el[0].setAttribute('flag', 'false'); });
    cy.wait(10);
    cy.get(`${tag} .t`).should('have.text', 'boolean:false');
  });
});
