'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { LazyEmojiPicker } from '@/core/components/common/lazy-emoji-picker';

interface DocsIconDialogProps {
	open: boolean;
	hasIcon: boolean;
	onPick: (emoji: string | null) => Promise<void> | void;
	onClose: () => void;
}

/** Picks the emoji a page shows before its title, or removes it. */
export function DocsIconDialog({ open, hasIcon, onPick, onClose }: DocsIconDialogProps) {
	const t = useTranslations();
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="w-auto max-w-[calc(100vw-2rem)] sm:max-w-fit">
				<DialogHeader>
					<DialogTitle>{t('docs.CHANGE_ICON')}</DialogTitle>
				</DialogHeader>
				<div className="flex justify-center">
					{open && (
						<LazyEmojiPicker
							onEmojiSelect={(emoji: { native: string }) => {
								void Promise.resolve(onPick(emoji.native)).then(onClose);
							}}
							previewPosition="none"
							skinTonePosition="none"
							maxFrequentRows={1}
							autoFocus
						/>
					)}
				</div>
				<DialogFooter>
					{hasIcon && (
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								void Promise.resolve(onPick(null)).then(onClose);
							}}
						>
							{t('docs.REMOVE_ICON')}
						</Button>
					)}
					<Button type="button" variant="outline" onClick={onClose}>
						{t('docs.CANCEL')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
