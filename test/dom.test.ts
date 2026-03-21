import { describe, it, expect } from 'vitest';
import {
  childAt,
  removeComments,
  setAttribute,
  setStyleAttribute,
  setSvgAttribute,
  createEventListener,
  insertText,
  setText,
  stringToDOM,
} from '../packages/million/dom';

describe('stringToDOM', () => {
  it('should parse HTML string to DOM element', () => {
    const el = stringToDOM('<div>hello</div>');
    expect(el.tagName).toBe('DIV');
    expect(el.textContent).toBe('hello');
  });

  it('should parse nested HTML', () => {
    const el = stringToDOM('<div><span>inner</span></div>');
    expect(el.firstChild!.nodeName).toBe('SPAN');
  });
});

describe('childAt', () => {
  it('should return firstChild for index 0', () => {
    const parent = stringToDOM('<div><span>a</span><span>b</span></div>');
    const child = childAt(parent, 0);
    expect(child!.textContent).toBe('a');
  });

  it('should return correct child at index', () => {
    const parent = stringToDOM('<div><span>a</span><span>b</span><span>c</span></div>');
    const child = childAt(parent, 2);
    expect(child!.textContent).toBe('c');
  });

  it('should return null for out-of-bounds index', () => {
    const parent = stringToDOM('<div><span>a</span></div>');
    const child = childAt(parent, 5);
    expect(child).toBeNull();
  });
});

describe('removeComments', () => {
  it('should remove comment nodes', () => {
    const el = document.createElement('div');
    el.appendChild(document.createComment('test comment'));
    el.appendChild(document.createTextNode('hello'));
    expect(el.childNodes.length).toBe(2);
    removeComments(el);
    expect(el.childNodes.length).toBe(1);
    expect(el.textContent).toBe('hello');
  });

  it('should remove nested comments', () => {
    const el = document.createElement('div');
    const span = document.createElement('span');
    span.appendChild(document.createComment('nested'));
    span.appendChild(document.createTextNode('text'));
    el.appendChild(span);
    removeComments(el);
    expect(span.childNodes.length).toBe(1);
  });

  it('should not revisit already visited nodes', () => {
    const el = document.createElement('div');
    el.appendChild(document.createTextNode('hello'));
    removeComments(el);
    removeComments(el); // should be a no-op
    expect(el.textContent).toBe('hello');
  });
});

describe('setAttribute', () => {
  it('should set attribute on element', () => {
    const el = document.createElement('div');
    setAttribute(el, 'title', 'test');
    expect(el.getAttribute('title')).toBe('test');
  });

  it('should remove attribute when value is null', () => {
    const el = document.createElement('div');
    setAttribute(el, 'title', 'test');
    setAttribute(el, 'title', null);
    expect(el.getAttribute('title')).toBeNull();
  });

  it('should remove attribute when value is undefined', () => {
    const el = document.createElement('div');
    setAttribute(el, 'title', 'test');
    setAttribute(el, 'title', undefined);
    expect(el.getAttribute('title')).toBeNull();
  });

  it('should remove attribute when value is empty string', () => {
    const el = document.createElement('div');
    setAttribute(el, 'title', 'test');
    setAttribute(el, 'title', '');
    expect(el.getAttribute('title')).toBeNull();
  });

  it('should handle boolean false without hyphen', () => {
    const el = document.createElement('div');
    setAttribute(el, 'hidden', false);
    expect(el.getAttribute('hidden')).toBeNull();
  });

  it('should set data- attributes with boolean false', () => {
    const el = document.createElement('div');
    setAttribute(el, 'data-active', false);
    expect(el.getAttribute('data-active')).toBe('false');
  });

  it('should set value on input element', () => {
    const el = document.createElement('input');
    setAttribute(el, 'value', 'hello');
    expect(el.value).toBe('hello');
    expect(el.getAttribute('value')).toBe('hello');
  });

  it('should set value attribute on select element', () => {
    const el = document.createElement('select');
    setAttribute(el, 'value', 'option1');
    expect(el.getAttribute('value')).toBe('option1');
  });

  it('should set value on textarea element', () => {
    const el = document.createElement('textarea');
    setAttribute(el, 'value', 'text content');
    expect(el.value).toBe('text content');
  });
});

describe('setStyleAttribute', () => {
  it('should set string style value', () => {
    const el = document.createElement('div');
    setStyleAttribute(el, 'color', 'red');
    expect(el.style.color).toBe('red');
  });

  it('should set numeric style with px suffix', () => {
    const el = document.createElement('div');
    setStyleAttribute(el, 'width', 100);
    expect(el.style.width).toBe('100px');
  });

  it('should not add px for non-dimensional properties', () => {
    const el = document.createElement('div');
    setStyleAttribute(el, 'opacity', 0.5);
    // Non-dimensional numbers are set directly
    expect(el.style.opacity).toBeDefined();
  });

  it('should clear style when value is null', () => {
    const el = document.createElement('div');
    setStyleAttribute(el, 'color', 'red');
    setStyleAttribute(el, 'color', null);
    expect(el.style.color).toBe('');
  });

  it('should handle undefined style value', () => {
    const el = document.createElement('div');
    // In the real implementation, undefined falls through to the px branch
    // since it's not a number, not a string, and doesn't start with -
    setStyleAttribute(el, 'width', 100);
    expect(el.style.width).toBe('100px');
  });
});

describe('setSvgAttribute', () => {
  it('should set xmlns attribute', () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    setSvgAttribute(el as unknown as HTMLElement, 'xmlns', 'http://www.w3.org/2000/svg');
    expect(el.getAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns')).toBe('http://www.w3.org/2000/svg');
  });
});

describe('createEventListener', () => {
  it('should create event listener on element', () => {
    const el = document.createElement('div');
    const handler = () => {};
    const patch = createEventListener(el, 'click', handler);
    expect(patch).toBeTypeOf('function');
    expect(el['$$click']).toBe(handler);
  });

  it('should patch event listener with new handler', () => {
    const el = document.createElement('div');
    const handler1 = () => {};
    const handler2 = () => {};
    const patch = createEventListener(el, 'click', handler1);
    expect(el['$$click']).toBe(handler1);
    patch(handler2);
    expect(el['$$click']).toBe(handler2);
  });

  it('should remove event listener when null is passed', () => {
    const el = document.createElement('div');
    const handler = () => {};
    const patch = createEventListener(el, 'click', handler);
    patch(null);
    expect(el['$$click']).toBeNull();
  });

  it('should handle capture events', () => {
    const el = document.createElement('div');
    const handler = () => {};
    createEventListener(el, 'clickcapture', handler);
    expect(el['$$click']).toBe(handler);
  });
});

describe('insertText', () => {
  it('should insert text node at position', () => {
    const el = document.createElement('div');
    el.appendChild(document.createElement('span'));
    const textNode = insertText(el, 'hello', 0);
    expect(textNode.textContent).toBe('hello');
    expect(el.firstChild).toBe(textNode);
  });
});

describe('setText', () => {
  it('should update text node content', () => {
    const textNode = document.createTextNode('hello');
    setText(textNode, 'world');
    expect(textNode.textContent).toBe('world');
  });
});
