import type { ReactPortal } from 'react';

export type MillionProps = Record<string, any>;

export interface Options<T extends MillionProps> {
  scoped?: true;
  name?: string;
  shouldUpdate?: (oldProps: T, newProps: T) => boolean;
  block?: any;
  ssr?: boolean;
  svg?: boolean;
  as?: string;
  rsc?: boolean;
  compiled?: boolean;
}

export interface MillionPortal {
  foreign: true;
  current: HTMLElement;
  portal: ReactPortal;
  unstable?: boolean;
}
