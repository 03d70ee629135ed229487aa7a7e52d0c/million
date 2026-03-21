import { describe, it, expect } from 'vitest';
import { transformAsync } from '@babel/core';
import { babel } from '../packages/compiler/babel';

async function transform(code: string, opts: Record<string, any> = {}) {
  const result = await transformAsync(code, {
    plugins: [[babel, { log: false, ...opts }]],
    parserOpts: { plugins: ['jsx', 'typescript'] },
    filename: 'test.tsx',
    ast: false,
    configFile: false,
    babelrc: false,
  });
  return result?.code || '';
}

describe('compiler babel plugin', () => {
  describe('block transform', () => {
    it('should transform block() call with JSX', async () => {
      const code = `
        import { block } from 'million/react';
        const App = block(() => <div>hello</div>);
      `;
      const result = await transform(code);
      expect(result).toContain('compiledBlock');
      expect(result).not.toContain('block(');
    });

    it('should transform block() with props', async () => {
      const code = `
        import { block } from 'million/react';
        const App = block((props) => <div className={props.cls}>{props.text}</div>);
      `;
      const result = await transform(code);
      expect(result).toContain('compiledBlock');
    });

    it('should handle block() with named function', async () => {
      const code = `
        import { block } from 'million/react';
        const MyComponent = block(function MyComponent(props) {
          return <div>{props.name}</div>;
        });
      `;
      const result = await transform(code);
      expect(result).toContain('compiledBlock');
    });
  });

  describe('auto transform', () => {
    it('should auto-transform large components', async () => {
      const code = `
        function LargeComponent(props) {
          return (
            <div>
              <h1>{props.title}</h1>
              <p>{props.desc}</p>
              <span>{props.extra}</span>
              <footer>static footer</footer>
              <nav>static nav</nav>
              <aside>static aside</aside>
            </div>
          );
        }
      `;
      const result = await transform(code, { auto: true });
      expect(result).toContain('block');
    });

    it('should skip small components in auto mode', async () => {
      const code = `
        function Small(props) {
          return <div>{props.text}</div>;
        }
      `;
      const result = await transform(code, { auto: true });
      // Too small to transform
      expect(result).not.toContain('block(');
    });

    it('should skip non-component functions in auto mode', async () => {
      const code = `
        function helperFunction() {
          return 42;
        }
      `;
      const result = await transform(code, { auto: true });
      expect(result).not.toContain('block');
    });

    it('should skip components with multiple return statements', async () => {
      const code = `
        function ConditionalComponent(props) {
          if (props.loading) {
            return <div>Loading...</div>;
          }
          return (
            <div>
              <h1>{props.title}</h1>
              <p>{props.desc}</p>
              <span>{props.extra}</span>
              <footer>static</footer>
              <nav>static</nav>
              <aside>static</aside>
            </div>
          );
        }
      `;
      const result = await transform(code, { auto: true });
      // Multiple returns should bail out
      expect(result).not.toContain('block(');
    });

    it('should transform React.memo() calls', async () => {
      const code = `
        import { memo } from 'react';
        const App = memo((props) => (
          <div>
            <h1>{props.title}</h1>
            <p>{props.desc}</p>
            <span>{props.extra}</span>
            <footer>static footer</footer>
            <nav>static nav</nav>
            <aside>static aside</aside>
          </div>
        ));
      `;
      const result = await transform(code, { auto: true });
      expect(result).toContain('block');
    });
  });

  describe('server mode', () => {
    it('should rewrite million/react imports to million/react-server', async () => {
      const code = `
        import { block } from 'million/react';
        const App = block(() => <div>hello</div>);
      `;
      const result = await transform(code, { server: true });
      expect(result).toContain('million/react-server');
    });
  });

  describe('import handling', () => {
    it('should convert million/react-server to million/react in client mode', async () => {
      const code = `
        import { block } from 'million/react-server';
        const App = block(() => <div>hello</div>);
      `;
      const result = await transform(code);
      expect(result).toContain('million/react');
      expect(result).not.toContain('million/react-server');
    });
  });

  describe('edge cases', () => {
    it('should handle arrow function components in auto mode', async () => {
      const code = `
        const BigArrow = (props) => (
          <div>
            <h1>{props.a}</h1>
            <h2>{props.b}</h2>
            <p>{props.c}</p>
            <span>static1</span>
            <span>static2</span>
            <span>static3</span>
          </div>
        );
      `;
      const result = await transform(code, { auto: true });
      expect(result).toContain('block');
    });

    it('should handle block with nested components (portals)', async () => {
      const code = `
        import { block } from 'million/react';
        const App = block((props) => (
          <div>
            <h1>title</h1>
            <OtherComponent name={props.name} />
            <p>footer</p>
          </div>
        ));
      `;
      const result = await transform(code);
      expect(result).toContain('compiledBlock');
    });

    it('should handle block with SVG elements', async () => {
      const code = `
        import { block } from 'million/react';
        const Icon = block((props) => (
          <svg viewBox="0 0 24 24">
            <path d={props.d} />
            <circle cx="12" cy="12" r={props.r} />
          </svg>
        ));
      `;
      const result = await transform(code);
      expect(result).toContain('compiledBlock');
    });

    it('should handle block with spread attributes', async () => {
      const code = `
        import { block } from 'million/react';
        const App = block((props) => (
          <div className={props.cls}>
            <span>{props.text}</span>
          </div>
        ));
      `;
      const result = await transform(code);
      expect(result).toContain('compiledBlock');
    });

    it('should handle exported function declarations in auto mode', async () => {
      const code = `
        export function BigExport(props) {
          return (
            <div>
              <h1>{props.a}</h1>
              <h2>{props.b}</h2>
              <p>{props.c}</p>
              <span>static1</span>
              <span>static2</span>
              <span>static3</span>
            </div>
          );
        }
      `;
      const result = await transform(code, { auto: true });
      expect(result).toContain('block');
    });

    it('should handle export default function in auto mode', async () => {
      const code = `
        export default function BigDefault(props) {
          return (
            <div>
              <h1>{props.a}</h1>
              <h2>{props.b}</h2>
              <p>{props.c}</p>
              <span>static1</span>
              <span>static2</span>
              <span>static3</span>
            </div>
          );
        }
      `;
      const result = await transform(code, { auto: true });
      expect(result).toContain('block');
    });

    it('should still transform even with skip annotation on simple blocks', async () => {
      const code = `
        import { block } from 'million/react';
        // @million skip
        const App = block((props) => <div>{props.text}</div>);
      `;
      const result = await transform(code);
      // The skip annotation applies to auto-detection, not explicit block() calls
      expect(result).toContain('compiledBlock');
    });

    it('should handle RSC mode with use client directive', async () => {
      const code = `
        "use client";
        function ClientComponent(props) {
          return (
            <div>
              <h1>{props.a}</h1>
              <h2>{props.b}</h2>
              <p>{props.c}</p>
              <span>static1</span>
              <span>static2</span>
              <span>static3</span>
            </div>
          );
        }
      `;
      const result = await transform(code, { auto: true, rsc: true });
      expect(result).toContain('block');
    });

    it('should skip server components without use client in RSC mode', async () => {
      const code = `
        function ServerComponent(props) {
          return (
            <div>
              <h1>{props.a}</h1>
              <h2>{props.b}</h2>
              <p>{props.c}</p>
              <span>static1</span>
              <span>static2</span>
              <span>static3</span>
            </div>
          );
        }
      `;
      const result = await transform(code, { auto: true, rsc: true });
      // Without 'use client' directive, should not transform in RSC mode
      expect(result).not.toContain('block(');
    });

    it('should handle block with style object props', async () => {
      const code = `
        import { block } from 'million/react';
        const Styled = block((props) => (
          <div style={{ color: props.color, margin: '10px' }}>
            <span>{props.text}</span>
          </div>
        ));
      `;
      const result = await transform(code);
      expect(result).toContain('compiledBlock');
    });

    it('should handle block with event handlers', async () => {
      const code = `
        import { block } from 'million/react';
        const Btn = block((props) => (
          <button onClick={props.onClick}>
            {props.label}
          </button>
        ));
      `;
      const result = await transform(code);
      expect(result).toContain('compiledBlock');
    });

    it('should skip functions with more than 1 param', async () => {
      const code = `
        function NotAComponent(a, b) {
          return (
            <div>
              <h1>{a}</h1>
              <h2>{b}</h2>
              <p>text</p>
              <span>s1</span>
              <span>s2</span>
              <span>s3</span>
            </div>
          );
        }
      `;
      const result = await transform(code, { auto: true });
      expect(result).not.toContain('block(');
    });

    it('should skip lowercase named functions', async () => {
      const code = `
        function helper(props) {
          return (
            <div>
              <h1>{props.a}</h1>
              <h2>{props.b}</h2>
              <p>{props.c}</p>
              <span>s1</span>
              <span>s2</span>
              <span>s3</span>
            </div>
          );
        }
      `;
      const result = await transform(code, { auto: true });
      // lowercase names are not component-ish
      expect(result).not.toContain('block(');
    });
  });
});
