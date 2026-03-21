import { describe, it, expect } from 'vitest';
import { block as createBlock, mapArray } from '../packages/million';
import type { MillionProps } from '../packages/types';
import type { VElement } from '../packages/million';

const itemFn = (props?: MillionProps): VElement => ({
  type: 'li',
  props: {
    children: [props?.text],
  },
});

describe('array advanced', () => {
  it('should mount empty array', () => {
    const parent = document.createElement('ul');
    const arr = mapArray([]);
    arr.m(parent);
    expect(parent.children.length).toBe(0);
  });

  it('should patch from empty to populated', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([]);
    arr.m(parent);
    arr.p(mapArray([block({ text: 'a' }, 'a'), block({ text: 'b' }, 'b')]));
    expect(parent.children.length).toBe(2);
  });

  it('should patch from populated to empty', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([block({ text: 'a' }, 'a')]);
    arr.m(parent);
    expect(parent.children.length).toBe(1);
    arr.p(mapArray([]));
    expect(parent.textContent).toBe('');
  });

  it('should handle head-to-head matching', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([
      block({ text: 'a' }, 'a'),
      block({ text: 'b' }, 'b'),
    ]);
    arr.m(parent);
    arr.p(mapArray([
      block({ text: 'a-updated' }, 'a'),
      block({ text: 'b-updated' }, 'b'),
    ]));
    expect(parent.children[0]?.textContent).toBe('a-updated');
    expect(parent.children[1]?.textContent).toBe('b-updated');
  });

  it('should handle tail-to-tail matching', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([
      block({ text: 'a' }, 'a'),
      block({ text: 'b' }, 'b'),
      block({ text: 'c' }, 'c'),
    ]);
    arr.m(parent);
    // Remove head, keep tail two
    arr.p(mapArray([
      block({ text: 'b-updated' }, 'b'),
      block({ text: 'c-updated' }, 'c'),
    ]));
    expect(parent.children.length).toBe(2);
  });

  it('should handle append at end', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([
      block({ text: 'a' }, 'a'),
    ]);
    arr.m(parent);
    arr.p(mapArray([
      block({ text: 'a' }, 'a'),
      block({ text: 'b' }, 'b'),
      block({ text: 'c' }, 'c'),
    ]));
    expect(parent.children.length).toBe(3);
    expect(parent.children[2]?.textContent).toBe('c');
  });

  it('should handle prepend at start', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([
      block({ text: 'b' }, 'b'),
    ]);
    arr.m(parent);
    arr.p(mapArray([
      block({ text: 'a' }, 'a'),
      block({ text: 'b' }, 'b'),
    ]));
    expect(parent.children.length).toBe(2);
  });

  it('should handle complete replacement', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([
      block({ text: 'a' }, 'a'),
      block({ text: 'b' }, 'b'),
    ]);
    arr.m(parent);
    arr.p(mapArray([
      block({ text: 'x' }, 'x'),
      block({ text: 'y' }, 'y'),
    ]));
    expect(parent.children.length).toBe(2);
  });

  it('should handle reverse order', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([
      block({ text: 'a' }, 'a'),
      block({ text: 'b' }, 'b'),
      block({ text: 'c' }, 'c'),
    ]);
    arr.m(parent);
    arr.p(mapArray([
      block({ text: 'c' }, 'c'),
      block({ text: 'b' }, 'b'),
      block({ text: 'a' }, 'a'),
    ]));
    expect(parent.children[0]?.textContent).toBe('c');
    expect(parent.children[1]?.textContent).toBe('b');
    expect(parent.children[2]?.textContent).toBe('a');
  });

  it('should serialize array blocks', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([
      block({ text: 'a' }, 'a'),
      block({ text: 'b' }, 'b'),
    ]);
    arr.m(parent);
    const serialized = arr.s();
    expect(serialized).toContain('<li>');
    expect(serialized).toContain('a');
    expect(serialized).toContain('b');
  });

  it('should get parent from array block', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([block({ text: 'a' }, 'a')]);
    arr.m(parent);
    expect(arr.t()).toBe(parent);
  });

  it('should no-op when patching same instance', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([block({ text: 'a' }, 'a')]);
    arr.m(parent);
    const result = arr.p(arr);
    expect(result).toBe(parent);
  });

  it('should no-op when both old and new are empty', () => {
    const parent = document.createElement('ul');
    const arr = mapArray([]);
    arr.m(parent);
    const result = arr.p(mapArray([]));
    expect(result).toBe(parent);
  });

  it('should remove all children', () => {
    const block = createBlock(itemFn);
    const parent = document.createElement('ul');
    const arr = mapArray([
      block({ text: 'a' }, 'a'),
      block({ text: 'b' }, 'b'),
    ]);
    arr.m(parent);
    arr.x();
    expect(arr.b).toEqual([]);
    expect(parent.textContent).toBe('');
  });
});
