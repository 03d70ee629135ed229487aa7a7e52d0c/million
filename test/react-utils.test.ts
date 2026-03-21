import { describe, it, expect } from 'vitest';
import { unwrap, flatten } from '../packages/react/utils';
import { isCompiledComponent, REGISTRY } from '../packages/react/constants';

describe('unwrap', () => {
  it('should return null for null', () => {
    expect(unwrap(null)).toBeNull();
  });

  it('should return string for string', () => {
    expect(unwrap('hello' as any)).toBe('hello');
  });

  it('should convert number to string', () => {
    expect(unwrap(42 as any)).toBe('42');
  });

  it('should return undefined for undefined', () => {
    expect(unwrap(undefined as any)).toBeUndefined();
  });

  it('should unwrap function type by calling it', () => {
    const component = (props: any) => ({
      type: 'div',
      props: { children: [props.text] },
    });
    const result = unwrap({ type: component, props: { text: 'hi' } } as any);
    expect(result).toEqual({
      type: 'div',
      props: { children: ['hi'] },
    });
  });

  it('should unwrap element with children', () => {
    const result = unwrap({
      type: 'div',
      props: {
        className: 'test',
        children: [
          { type: 'span', props: { children: ['hello'] } },
        ],
      },
    } as any);
    expect(result).toEqual({
      type: 'div',
      props: {
        className: 'test',
        children: [
          {
            type: 'span',
            props: { children: ['hello'] },
          },
        ],
      },
    });
  });

  it('should handle object type with $ property', () => {
    const obj = { $: 'hole' };
    const result = unwrap({ type: obj, props: {} } as any);
    expect(result).toBe(obj);
  });

  it('should handle element without children', () => {
    const result = unwrap({
      type: 'br',
      props: {},
    } as any);
    expect(result).toEqual({ type: 'br', props: {} });
  });
});

describe('flatten', () => {
  it('should return empty array for null', () => {
    expect(flatten(null)).toEqual([]);
  });

  it('should return empty array for undefined', () => {
    expect(flatten(undefined)).toEqual([]);
  });

  it('should wrap single element in array', () => {
    const el = { type: 'div', props: {} };
    expect(flatten(el as any)).toEqual([el]);
  });

  it('should flatten nested arrays', () => {
    const a = { type: 'a', props: {} };
    const b = { type: 'b', props: {} };
    const result = flatten([[a, b]] as any);
    expect(result).toEqual([a, b]);
  });

  it('should handle object with $ property', () => {
    const hole = { $: 'test' };
    const result = flatten(hole as any);
    expect(result).toEqual([hole]);
  });
});

describe('isCompiledComponent', () => {
  it('should return false for non-function', () => {
    expect(isCompiledComponent('string')).toBe(false);
    expect(isCompiledComponent(42)).toBe(false);
    expect(isCompiledComponent(null)).toBe(false);
    expect(isCompiledComponent(undefined)).toBe(false);
  });

  it('should return false for function without _c', () => {
    expect(isCompiledComponent(() => {})).toBe(false);
  });

  it('should return true for function with _c', () => {
    const fn = () => {};
    (fn as any)._c = true;
    expect(isCompiledComponent(fn)).toBe(true);
  });
});

describe('REGISTRY', () => {
  it('should be a Map', () => {
    expect(REGISTRY).toBeInstanceOf(Map);
  });
});
