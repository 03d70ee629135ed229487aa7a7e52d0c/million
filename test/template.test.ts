import { describe, it, expect } from 'vitest';
import { renderToTemplate } from '../packages/million/template';

describe('renderToTemplate', () => {
  it('should render string vnode', () => {
    expect(renderToTemplate('hello')).toBe('hello');
  });

  it('should render number vnode', () => {
    expect(renderToTemplate(42 as any)).toBe('42');
  });

  it('should render bigint vnode', () => {
    expect(renderToTemplate(BigInt(99) as any)).toBe('99');
  });

  it('should render true as string', () => {
    expect(renderToTemplate(true as any)).toBe('true');
  });

  it('should render null as empty string', () => {
    expect(renderToTemplate(null as any)).toBe('');
  });

  it('should render undefined as empty string', () => {
    expect(renderToTemplate(undefined as any)).toBe('');
  });

  it('should render false as empty string', () => {
    expect(renderToTemplate(false as any)).toBe('');
  });

  it('should render element with props', () => {
    const result = renderToTemplate({
      type: 'div',
      props: { className: 'test', children: ['hello'] },
    });
    expect(result).toBe('<div class="test">hello</div>');
  });

  it('should render nested elements', () => {
    const result = renderToTemplate({
      type: 'div',
      props: {
        children: [
          { type: 'span', props: { children: ['inner'] } },
        ],
      },
    });
    expect(result).toBe('<div><span>inner</span></div>');
  });

  it('should render void elements self-closed', () => {
    const result = renderToTemplate({
      type: 'input',
      props: { type: 'text' },
    });
    expect(result).toBe('<input type="text" />');
  });

  it('should skip key, ref, and children props', () => {
    const result = renderToTemplate({
      type: 'div',
      props: { key: '1', ref: {}, title: 'test', children: [] },
    });
    expect(result).toBe('<div title="test"></div>');
  });

  it('should handle hole ($) in props', () => {
    const edits: any[] = [];
    renderToTemplate(
      {
        type: 'div',
        props: { title: { $: 'myTitle' }, children: [] },
      },
      edits,
    );
    expect(edits.length).toBe(1);
    expect(edits[0].e[0].h).toBe('myTitle');
  });

  it('should handle hole ($) child as slot', () => {
    const edits: any[] = [];
    const result = renderToTemplate(
      { $: 'content' } as any,
      edits,
    );
    expect(result).toBe('<slot/>');
    expect(edits[0].e[0].h).toBe('content');
  });

  it('should handle event props with holes', () => {
    const edits: any[] = [];
    renderToTemplate(
      {
        type: 'button',
        props: { onClick: { $: 'handler' }, children: ['click'] },
      },
      edits,
    );
    expect(edits[0].e[0].n).toBe('Click');
    expect(edits[0].e[0].h).toBe('handler');
  });

  it('should handle static event props', () => {
    const edits: any[] = [];
    const handler = () => {};
    renderToTemplate(
      {
        type: 'button',
        props: { onClick: handler, children: ['click'] },
      },
      edits,
    );
    expect(edits[0].i[0].l).toBe(handler);
  });

  it('should handle style prop as object with static values', () => {
    const result = renderToTemplate({
      type: 'div',
      props: { style: { marginTop: '10px', color: 'red' }, children: [] },
    });
    expect(result).toContain('style="');
    expect(result).toContain('margin-top:10px;');
    expect(result).toContain('color:red;');
  });

  it('should handle style prop with hole values', () => {
    const edits: any[] = [];
    renderToTemplate(
      {
        type: 'div',
        props: { style: { $: 'myStyle' }, children: [] },
      },
      edits,
    );
    expect(edits[0].e[0].h).toBe('myStyle');
  });

  it('should handle svg attribute holes', () => {
    const edits: any[] = [];
    renderToTemplate(
      {
        type: 'svg',
        props: { xlinkHref: { $: 'href' }, children: [] },
      },
      edits,
    );
    expect(edits[0].e[0].h).toBe('href');
  });

  it('should skip null, undefined, and false children', () => {
    const result = renderToTemplate({
      type: 'div',
      props: { children: [null, undefined, false, 'visible'] },
    });
    expect(result).toBe('<div>visible</div>');
  });

  it('should handle hole children', () => {
    const edits: any[] = [];
    renderToTemplate(
      {
        type: 'div',
        props: { children: [{ $: 'content' }] },
      },
      edits,
    );
    expect(edits[0].e[0].h).toBe('content');
  });

  it('should handle number children', () => {
    const result = renderToTemplate({
      type: 'div',
      props: { children: [42] },
    });
    expect(result).toBe('<div>42</div>');
  });

  it('should handle mixed string and element children', () => {
    const result = renderToTemplate({
      type: 'div',
      props: {
        children: [
          'hello',
          { type: 'span', props: { children: ['world'] } },
          'end',
        ],
      },
    });
    expect(result).toBe('<div>hello<span>world</span>end</div>');
  });
});
