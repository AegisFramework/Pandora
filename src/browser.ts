import * as Pandora from './index';

declare global {
  interface Window {
    Pandora: typeof Pandora;
  }
}

if (typeof window === 'object') {
  window.Pandora = Pandora;
}