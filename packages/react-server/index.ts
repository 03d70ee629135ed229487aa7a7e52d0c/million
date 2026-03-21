import type {
  ComponentType,
  ForwardedRef,
  JSX,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  ReactPortal,
} from 'react';
import {
  Fragment,
  createElement,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect as uLE,
  useRef,
  useState,
} from 'react';
import parse from 'html-react-parser';
import { RENDER_SCOPE, SVG_RENDER_SCOPE } from '../react/constants';
import type {
  MillionPortal,
  MillionProps,
  Options,
} from '../types';
import { renderReactScope } from '../react/utils';
import { useSSRSafeId } from './utils';

const useLayoutEffect = typeof window === 'undefined' ? useEffect : uLE;
let globalInfo: any;

function Effect({ effect }: { effect: () => void }) {
  useEffect(effect, []);
  return null;
}

export const importSource = (callback: () => void) => {
  void import('../react')
    .then(({ unwrap, INTERNALS, compiledBlock, removeComments }) => {
      globalInfo = {
        unwrap,
        compiledBlock,
        removeComments,
        ...INTERNALS,
      };

      callback();
    })
    .catch((e) => {
      throw new Error(`Failed to load Million.js: ${e}`);
    });
};

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  importSource(() => {});
}

const ssrElementsMap = new Map<string, ReactElement>();
export const createSSRBoundary = <P extends MillionProps>(
  Component: ComponentType<P>,
  props: P,
  ref: ForwardedRef<unknown>,
  id: string,
  svg = false,
) => {
  const isServer = typeof window === 'undefined';
  const ssrProps = isServer
    ? {
        children: createElement<P>(Component, props),
      }
    : {
        dangerouslySetInnerHTML: {
          __html: document.getElementById(id)?.innerHTML || "",
        },
      };
  if (ssrElementsMap.has(id)) {
    return ssrElementsMap.get(id)!;
  }

  const el = createElement(svg ? SVG_RENDER_SCOPE : RENDER_SCOPE, {
    suppressHydrationWarning: true,
    ref,
    id,
    ...ssrProps,
  });
  ssrElementsMap.set(id, el);
  return el;
};

const thrown = new Map();

function Suspend({
  children,
  id,
}: PropsWithChildren<{ id: string }>): ReactNode {
  if (typeof window === 'undefined') {
    return children;
  }

  let html = '';
  const startTemplate = document.getElementById(`start-${id}`);
  const endTemplate = document.getElementById(`end-${id}`);
  if (!thrown.has(id) && startTemplate && endTemplate) {
    let el = startTemplate.nextElementSibling;
    while (el && el !== endTemplate) {
      html += el.outerHTML;
      el = el.nextElementSibling;
    }
    startTemplate.remove();
    endTemplate.remove();
    thrown.set(id, parse(html));
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw Promise.resolve();
  }
  // we can return null to avoid parsing but this would cause a flashing
  return thrown.get(id);
}

const createHydrationBoundary = (
  id: string,
  phase: 'start' | 'end',
  isSSR: boolean,
) => {
  // TODO: Better to use html commnts which are not allowed in React
  return isSSR ? createElement('template', { id: `${phase}-${id}` }) : null;
};

export const createRSCBoundary = <P extends MillionProps>(
  Component: ComponentType<P>,
  svg = false,
) => {
  return memo(
    forwardRef((props: P, ref) => {
      const id = useSSRSafeId();
      return createSSRBoundary(Component, props, ref, id, svg);
    }),
    () => true,
  );
};

function isEqual(a: unknown, b: unknown): boolean {
  // Faster than Object.is
  // eslint-disable-next-line no-self-compare
  return a === b || (a !== a && b !== b);
}

function shouldCompiledBlockUpdate(
  prev: MillionProps,
  next: MillionProps,
): boolean {
  for (const key in prev) {
    if (!isEqual(prev[key], next[key])) {
      return true;
    }
  }
  return false;
}

interface CompiledBlockOptions
  extends Omit<Options<MillionProps>, 'shouldUpdate'> {
  portals?: string[];
}

export function compiledBlock(
  render: (props: MillionProps) => JSX.Element,
  { portals, ...options }: CompiledBlockOptions,
): ComponentType<MillionProps> {
  let blockFactory: any = null;

  const rscBoundary = options.rsc
    ? createRSCBoundary(
        ((props: MillionProps) => render(props)) as any,
        options.svg,
      )
    : null;

  function MillionBlockLoader(props: MillionProps) {
    const id = useSSRSafeId();
    const initializedRef = useRef(false);
    const ref = useRef<HTMLElement | null>(null);
    const patch = useRef<((props: MillionProps) => void) | null>(null);

    const effect = useCallback(() => {
      const init = (): void => {
        if (!ref.current) return;
        const el = ref.current!;

        globalInfo.removeComments(el);

        const currentBlock = blockFactory(props, props.key);

        globalInfo.mount(currentBlock, el, el.firstChild);
        patch.current = (newProps: MillionProps) => {
          globalInfo.patch(currentBlock, blockFactory(newProps, newProps.key));
        };
      };

      if (blockFactory && globalInfo) {
        init();
      } else if (!initializedRef.current) {
        initializedRef.current = true;
        importSource(() => {
          if (!initializedRef.current) {
            return;
          }
          blockFactory = globalInfo.block(
            (p: MillionProps) => render(p),
            globalInfo.unwrap,
            shouldCompiledBlockUpdate,
            options.svg,
          );

          init();
        });
      }

      return () => {
        blockFactory = null;
      };
    }, []);

    patch.current?.(props);

    const vnode = createElement(
      Fragment,
      null,
      createElement(Effect, { effect }),
      rscBoundary
        ? createElement(rscBoundary, { ...props, ref } as any)
        : createSSRBoundary(
            ((p: MillionProps) => render(p)) as any,
            props,
            ref,
            id,
            options.svg,
          ),
    );
    return vnode;
  }

  if (options.name) {
    MillionBlockLoader.displayName = `Block(Million(CompiledBlock(${options.name})))`;
  }

  const portalCount = portals?.length || 0;

  const Component: ComponentType<MillionProps> =
    portals && portalCount > 0
      ? (props: MillionProps) => {
          const id = useSSRSafeId();
          const [current] = useState<MillionPortal[]>(() => []);
          const [firstRender, setFirstRender] = useState(true);

          const derived = { ...props };

          for (let i = 0; i < portalCount; i++) {
            const index = portals[i]!;
            derived[index] = renderReactScope(
              derived[index] as JSX.Element,
              false,
              current,
              i,
              `${id}:${index}`,
            );
          }
          const targets: ReactPortal[] = [];

          useLayoutEffect(() => {
            setFirstRender(false);
          }, []);
          for (let i = 0, len = current.length; i < len; i++) {
            targets[i] = current[i]!.portal;
          }

          return createElement(
            Fragment,
            {},
            createElement(MillionBlockLoader, derived),
            !firstRender ? targets : undefined,
          );
        }
      : (props: MillionProps) => createElement(MillionBlockLoader, props);

  if (options.name) {
    Component.displayName = `Million(CompiledBlock(Outer(${options.name})))`;
  }

  return Component;
}
