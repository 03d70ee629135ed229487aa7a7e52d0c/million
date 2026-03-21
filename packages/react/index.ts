import { block as internalBlock, patch, mount } from '../million';

export const block = () => {
  throw new Error(
    'block() requires the Million.js compiler plugin. Manual runtime usage is no longer supported.',
  );
};
export { renderReactScope, unwrap } from './utils';
export { REGISTRY } from './constants';
export const INTERNALS = {
  block: internalBlock,
  patch,
  mount,
};

export { removeComments } from '../million/dom';

export { compiledBlock } from './compiled-block';

if (typeof window !== 'undefined') {
  (window as any).__MILLION_DATA__ = {
    version: process.env.VERSION,
  };
}
