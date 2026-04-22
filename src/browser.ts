/**
 * Browser bundle entrypoint for non-module consumers.
 *
 * Load the built bundle from a plain `<script>` tag, or import from
 * `'@aegis-framework/pandora/browser'` for its side effects: the module
 * assigns the entire Pandora namespace to `window.Pandora` so globals like
 * `Pandora.Component` and `Pandora.html` are available without any import
 * statement.
 *
 * Module-based apps should import from the main entry
 * (`'@aegis-framework/pandora'`) instead. This file exists purely because
 * bundlers cannot yet expose an ESM module as a browser global on their
 * own; once/if Bun grows that capability, the file can go away.
 */

import * as Pandora from './index';

declare global {
  interface Window {
    Pandora: typeof Pandora;
  }
}

if (typeof window === 'object') {
  window.Pandora = Pandora;
}
