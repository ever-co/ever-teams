import { useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useClose } from '@headlessui/react';
import { Keyboard } from '@/core/components/icons';
import { shortcutsHelpOpenAtom } from '@/core/stores/common/shortcuts';
import { Button } from './button';
import { Tooltip } from '../duplicated-components/tooltip';

/** The keyboard button of the top bar and of the account menu: it opens the app's one shortcuts sheet. */
export function KeyboardShortcuts() {
	const t = useTranslations();
	const setSheetOpen = useSetAtom(shortcutsHelpOpenAtom);
	// The account menu it sits in on phones closes first: its panel is drawn above every dialog. Elsewhere a no-op.
	const closeMenu = useClose();
	const openSheet = () => {
		closeMenu();
		setSheetOpen(true);
	};

	return (
		<Tooltip label={t('common.KEYBOARD_SHORTCUTS')} placement="auto">
			<Button
				variant="ghost"
				size="icon"
				className="m-0 min-w-0 text-muted-foreground"
				onClick={openSheet}
				aria-label={t('common.KEYBOARD_SHORTCUTS')}
			>
				<Keyboard className="size-4" />
			</Button>
		</Tooltip>
	);
}
