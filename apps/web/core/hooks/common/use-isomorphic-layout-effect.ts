'use client';

import { useEffect, useLayoutEffect } from 'react';

/** Runs before passive hydration effects in the browser without warning during SSR. */
export const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
