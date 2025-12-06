// This file is basically just a hack to expose the Pandora namespace in the
// window object. Once/if bun adds support for this, we can remove this file.

import * as Pandora from './index';

declare global {
  interface Window {
    Pandora: typeof Pandora;
  }
}

if (typeof window === 'object') {
  window.Pandora = Pandora;
}