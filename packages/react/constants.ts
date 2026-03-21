import { useEffect } from 'react';
import type { ComponentType, DependencyList } from 'react';

export const RENDER_SCOPE = 'slot';
export const SVG_RENDER_SCOPE = 'g';
export const REACT_ROOT = '__react_root';

export const Effect = ({
  effect,
  deps,
}: {
  effect: () => void;
  deps?: DependencyList;
}): null => {
  useEffect(effect, deps || []);
  return null;
};

export const REGISTRY = new Map<ComponentType, any>();

/**
 * Detects if a component function has been processed by Million's compiler or
 * React Compiler. React Compiler sets a `_c` cache property on compiled functions.
 * The marker name may change in future React Compiler versions.
 */
export function isCompiledComponent(type: unknown): boolean {
  return typeof type === 'function' && '_c' in (type as any);
}
