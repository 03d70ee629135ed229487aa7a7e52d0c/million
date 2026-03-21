import type { ReactPortal, ComponentType, JSX, Ref } from 'react';
import {
  createElement,
  useState,
  useContext,
  useCallback,
  useMemo,
  useRef,
  Fragment,
} from 'react';
import {
  block as createBlock,
  mount$,
  patch as patchBlock,
  remove$ as removeBlock,
} from '../million/block';
import { MapHas$, MapSet$ } from '../million/constants';
import type { MillionPortal, MillionProps, Options } from '../types';
import { Effect, REGISTRY, RENDER_SCOPE, SVG_RENDER_SCOPE } from './constants';
import { processProps, renderReactScope, scopedContext, unwrap } from './utils';

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
  const blockName = `CompiledBlock(Inner(${options.name}))`;
  const defaultType = options.svg ? SVG_RENDER_SCOPE : RENDER_SCOPE;

  const blockTarget = createBlock(
    ((props: MillionProps) => render(props)) as any,
    unwrap as any,
    shouldCompiledBlockUpdate as Parameters<typeof createBlock>[2],
    options.svg,
  );

  const RenderBlock = (props: MillionProps, forwardedRef: Ref<any>) => {
    const hmrTimestamp = props._hmr;
    const ref = useRef<HTMLElement | null>(null);
    const patch = useRef<((props: MillionProps) => void) | null>(null);
    const portalRef = useRef<MillionPortal[]>([]);

    props = processProps(props, forwardedRef, portalRef.current);
    patch.current?.(props);

    const effect = useCallback(() => {
      if (!ref.current) return;
      const currentBlock = blockTarget(props, props.key);
      if (hmrTimestamp && ref.current?.textContent) {
        ref.current.textContent = '';
      }
      if (patch.current === null || hmrTimestamp) {
        mount$.call(currentBlock, ref.current!, null);
        patch.current = (props: MillionProps) => {
          patchBlock(
            currentBlock,
            blockTarget(
              props,
              props.key,
              shouldCompiledBlockUpdate as Parameters<typeof createBlock>[2],
            ),
          );
        };
      }
      return () => {
        removeBlock.call(currentBlock);
      };
    }, []);

    const marker = useMemo(() => {
      return createElement(options.as ?? defaultType, { ref });
    }, []);

    const childrenSize = portalRef.current.length;
    const children = new Array(childrenSize);
    for (let i = 0; i < childrenSize; ++i) {
      children[i] = portalRef.current[i]?.portal;
    }

    return createElement(
      Fragment,
      {},
      marker,
      createElement(Effect, {
        effect,
        deps: hmrTimestamp ? [hmrTimestamp] : [],
      }),
      children,
    );
  };

  if (!MapHas$.call(REGISTRY, RenderBlock)) {
    MapSet$.call(REGISTRY, RenderBlock, compiledBlock);
  }

  if (options.name) {
    RenderBlock.displayName = `Million(Block(${blockName}))`;
  }

  const portalCount = portals?.length || 0;

  const Component: ComponentType<MillionProps> =
    portals && portalCount > 0
      ? (props: MillionProps) => {
          const scoped = useContext(scopedContext);
          const [current] = useState<MillionPortal[]>(() => []);

          const derived = { ...props, scoped };

          for (let i = 0; i < portalCount; i++) {
            const index = portals[i]!;
            const scope = renderReactScope(
              derived[index] as JSX.Element,
              false,
              current,
              i,
            );
            derived[index] = scope;
          }

          const targets: ReactPortal[] = [];

          for (let i = 0, len = current.length; i < len; i++) {
            targets[i] = current[i]!.portal;
          }

          return createElement(
            Fragment,
            null,
            createElement(RenderBlock, derived),
            targets,
          );
        }
      : (props: MillionProps) => createElement(RenderBlock, props);

  if (options.name) {
    Component.displayName = `Million(CompiledBlock(Outer(${options.name})))`;
  }

  return Component;
}
