import { describe, it, expect } from 'vitest';
import { block as createBlock, withKey, patch, mount } from '../packages/million';
import type { MillionProps } from '../packages/types';
import type { VElement } from '../packages/million';

const fn = (props?: MillionProps): VElement => ({
  type: 'div',
  props: {
    children: [
      {
        type: 'p',
        props: {
          className: props?.cls,
          children: [props?.text],
        },
      },
    ],
  },
});

describe('block advanced', () => {
  it('should support custom shouldUpdate', () => {
    const shouldUpdate = (old: MillionProps, next: MillionProps) => {
      return old.text !== next.text; // only update on text change
    };
    const block = createBlock(fn, undefined, shouldUpdate);
    const main = block({ text: 'hello', cls: 'a' });
    main.m();
    // cls changed but shouldUpdate only checks text — should not update cls
    main.p(block({ text: 'hello', cls: 'b' }));
    expect(main.l?.outerHTML).toContain('class="a"');
    // text changed — should update
    main.p(block({ text: 'world', cls: 'b' }));
    expect(main.l?.outerHTML).toContain('world');
  });

  it('should serialize block to HTML string', () => {
    const block = createBlock(fn);
    const main = block({ text: 'hi', cls: 'x' });
    main.m();
    expect(main.s()).toContain('<div>');
    expect(main.s()).toContain('hi');
  });

  it('should get parent element', () => {
    const block = createBlock(fn);
    const parent = document.createElement('main');
    const main = block({ text: 'hi', cls: 'x' });
    mount(main, parent);
    expect(main.t()).toBe(parent);
  });

  it('should move block', () => {
    const block = createBlock(fn);
    const parent = document.createElement('div');
    const a = block({ text: 'a', cls: 'a' }, 'a');
    const b = block({ text: 'b', cls: 'b' }, 'b');
    mount(a, parent);
    mount(b, parent);
    expect(parent.children[0]?.textContent).toBe('a');
    expect(parent.children[1]?.textContent).toBe('b');
    // Move b before a
    b.v(a);
    expect(parent.children[0]?.textContent).toBe('b');
    expect(parent.children[1]?.textContent).toBe('a');
  });

  it('should withKey attach key to value', () => {
    const obj: any = { name: 'test' };
    const result = withKey(obj, 'mykey');
    expect(result.key).toBe('mykey');
    expect(result.name).toBe('test');
  });

  it('should patch blocks with different keys via replace', () => {
    const block = createBlock(fn);
    const parent = document.createElement('div');
    const a = block({ text: 'a', cls: 'a' }, 'key-a');
    mount(a, parent);
    expect(parent.children[0]?.textContent).toBe('a');
    const b = block({ text: 'b', cls: 'b' }, 'key-b');
    patch(a, b);
    // After patching with different key, old block is replaced
    expect(parent.textContent).toContain('b');
  });

  it('should handle event listeners', () => {
    let clicked = false;
    const blockFn = (props?: MillionProps): VElement => ({
      type: 'button',
      props: {
        onClick: props?.handler,
        children: ['click me'],
      },
    });
    const block = createBlock(blockFn);
    const main = block({ handler: () => { clicked = true; } });
    main.m();
    // The event handler is registered via delegation
    expect(main.l?.tagName).toBe('BUTTON');
  });

  it('should handle style object patching', () => {
    const styleFn = (props?: MillionProps): VElement => ({
      type: 'div',
      props: {
        style: { margin: props?.margin, color: props?.color },
        children: [],
      },
    });
    const block = createBlock(styleFn);
    const main = block({ margin: 10, color: 'red' });
    main.m();
    expect(main.l?.outerHTML).toContain('margin');
  });

  it('should handle attribute patching', () => {
    const attrFn = (props?: MillionProps): VElement => ({
      type: 'div',
      props: {
        title: props?.title,
        'data-id': props?.id,
        children: [],
      },
    });
    const block = createBlock(attrFn);
    const main = block({ title: 'hello', id: '1' });
    main.m();
    expect(main.l?.getAttribute('title')).toBe('hello');
    expect(main.l?.getAttribute('data-id')).toBe('1');
    main.p(block({ title: 'world', id: '2' }));
    expect(main.l?.getAttribute('title')).toBe('world');
    expect(main.l?.getAttribute('data-id')).toBe('2');
  });

  it('should skip patch when props are identical objects', () => {
    const block = createBlock(fn);
    const props = { text: 'same', cls: 'same' };
    const main = block(props);
    main.m();
    const html1 = main.l?.outerHTML;
    // Patch with same props
    main.p(block(props));
    expect(main.l?.outerHTML).toBe(html1);
  });

  it('should handle null props in new block during patch', () => {
    const block = createBlock(fn);
    const main = block({ text: 'hello', cls: 'a' });
    main.m();
    const result = main.p(block(null));
    expect(result).toBe(main.l);
  });

  it('should handle mount with parent and refNode', () => {
    const block = createBlock(fn);
    const parent = document.createElement('div');
    const existing = document.createElement('span');
    parent.appendChild(existing);
    const main = block({ text: 'hi', cls: 'x' });
    main.m(parent, existing);
    // Should be inserted before existing
    expect(parent.firstChild).toBe(main.l);
    expect(parent.lastChild).toBe(existing);
  });

  it('should not remount if already mounted', () => {
    const block = createBlock(fn);
    const parent = document.createElement('div');
    const main = block({ text: 'hi', cls: 'x' });
    const el1 = main.m(parent);
    const el2 = main.m(parent);
    expect(el1).toBe(el2);
  });
});
