'use client';

import { useId } from 'react';
import { useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AppSwitcherPreview } from '@/core/components/common/app-switcher-preview';
import { useAppSwitcherPlacement } from '@/core/hooks/common/use-app-switcher-placement';
import { useHasMounted } from '@/core/hooks/common/use-has-mounted';
import {
	APP_SWITCHER_PLACEMENTS,
	appSwitcherPlacementState,
	type AppSwitcherPlacement
} from '@/core/stores/common/app-switcher';
import { PreferenceTile } from './preference-tile';

const LABEL_KEYS = {
	sidebar: 'settings.preferences.APP_SWITCHER_SIDEBAR',
	header: 'settings.preferences.APP_SWITCHER_HEADER',
	rail: 'settings.preferences.APP_SWITCHER_RAIL'
} as const;

export function AppSwitcherTiles() {
	const t = useTranslations();
	const name = useId();
	const { mounted } = useHasMounted();
	const placement = useAppSwitcherPlacement();
	const setPlacement = useSetAtom(appSwitcherPlacementState);

	const pick = (choice: AppSwitcherPlacement) => {
		try {
			setPlacement(choice);
		} catch {
			const message = t('settings.preferences.SYNC_SAVE_FAILED');
			toast.error(message);
		}
	};

	return (
		<fieldset className="grid grid-cols-3 gap-3 p-4">
			<legend className="sr-only">{t('settings.preferences.SECTION_APP_SWITCHER')}</legend>
			{APP_SWITCHER_PLACEMENTS.map((choice) => {
				const isStoredChoice = placement === choice;
				const isPicked = mounted && isStoredChoice;
				return (
					<PreferenceTile
						key={choice}
						name={name}
						value={choice}
						label={t(LABEL_KEYS[choice])}
						isPicked={isPicked}
						onPick={() => pick(choice)}
						preview={<AppSwitcherPreview placement={choice} className="block h-auto w-full" />}
					/>
				);
			})}
		</fieldset>
	);
}
