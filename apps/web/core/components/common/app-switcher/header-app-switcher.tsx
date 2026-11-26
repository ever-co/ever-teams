'use client';

import { useHasMounted } from '@/core/hooks/common/use-has-mounted';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import { AppSwitcherMenu } from './app-switcher-menu';

/** Top bar position (spec A3): an apps grid at the end of the bar; the Ever mark stays in the sidebar, plain. */
export function HeaderAppSwitcher() {
	const { mounted } = useHasMounted();
	const placement = useAppSwitcherPlacement();
	const isHeaderPicked = placement === 'header';
	const showsButton = mounted && isHeaderPicked;

	if (!showsButton) {
		return null;
	}

	return <AppSwitcherMenu side="bottom" align="end" size="icon" trigger="grid" />;
}
