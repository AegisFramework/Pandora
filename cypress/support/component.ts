let tagCounter = 0;

export function uniqueTag(prefix: string): string {
  return `${prefix}-test-${++tagCounter}-${Date.now()}`;
}

export function mountComponent(tagName: string, innerHTML: string = ''): Cypress.Chainable {
  const root = document.querySelector('[data-cy-root]')!;
  root.innerHTML = `<${tagName}>${innerHTML}</${tagName}>`;

  return cy.get(`${tagName}`, { timeout: 10000 }).should(($el) => {
    expect(($el[0] as any).isReady).to.be.true;
  });
}

Cypress.Commands.add('mount', (tagName: string, innerHTML?: string) => {
  return mountComponent(tagName, innerHTML);
});

declare global {
  namespace Cypress {
    interface Chainable {
      mount(tagName: string, innerHTML?: string): Chainable<Element>;
    }
  }
}
