'use client';

import { useHasMounted } from '@/core/hooks/common/use-has-mounted';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import { AppSwitcherMenu } from './app-switcher-menu';

export function HeaderAppSwitcher() {
	const { mounted } = useHasMounted();
	const placement = useAppSwitcherPlacement();
	const isHeaderPicked = placement === 'header';
	const showsButton = mounted && isHeaderPicked;

	if (!showsButton) {
		return null;
	}

	return <AppSwitcherMenu side="bottom" align="end" size="icon" />;
}
