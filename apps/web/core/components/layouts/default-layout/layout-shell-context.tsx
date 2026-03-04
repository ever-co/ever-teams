'use client';

import { createContext, useContext } from 'react';

/**
 * Context to detect if a component is rendered inside LayoutShell.
 * Used during the MainLayout → PageLayout migration to prevent double sidebar rendering.
 *
 * When LayoutShell is a parent, MainLayout will skip rendering its own sidebar/container
 * and delegate to PageLayout instead.
 */
export const LayoutShellContext = createContext<boolean>(false);

/**
 * Hook to check if the current component tree is inside a LayoutShell.
 * @returns true if LayoutShell is an ancestor, false otherwise
 */
export const useIsInsideLayoutShell = () => useContext(LayoutShellContext);

