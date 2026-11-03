'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { LazyEmojiPicker } from '@/core/components/common/lazy-emoji-picker';
import { MENU_ROW, MENU_ROW_DESTRUCTIVE } from '@/core/components/common/menu-recipes';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { ChevronDown, Spinner, Trash } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';

interface PickedEmoji {
	native: string;
}

export function TeamEmojiValue({ emoji }: Readonly<{ emoji: string | null | undefined }>) {
	const t = useTranslations();
	if (!emoji) {
		return <span className="text-[13px] text-muted-foreground">{t('settings.teamGeneral.EMOJI_NONE')}</span>;
	}
	return <span className="text-base leading-none">{emoji}</span>;
}

function TriggerFace({ emoji, isPending }: Readonly<{ emoji: string | null; isPending: boolean }>) {
	const t = useTranslations();
	if (isPending) {
		return <Spinner className="size-3.5 animate-spin" />;
	}
	if (!emoji) {
		return <span className="text-muted-foreground">{t('settings.teamGeneral.EMOJI_NONE')}</span>;
	}
	return <span className="text-base leading-none">{emoji}</span>;
}

interface TeamEmojiControlProps {
	emoji: string | null;
	onSave: (emoji: string | null) => Promise<void>;
}

export function TeamEmojiControl({ emoji, onSave }: Readonly<TeamEmojiControlProps>) {
	const t = useTranslations();
	const { resolvedTheme } = useTheme();
	const { value, isPending, change } = useOptimisticSetting<string | null>(emoji, onSave);
	const [isOpen, setIsOpen] = useState(false);
	const hasEmoji = Boolean(value);

	const save = (next: string | null) => {
		setIsOpen(false);
		void change(next);
	};

	let valueText: string = t('settings.teamGeneral.EMOJI_NONE');
	if (value) {
		valueText = value;
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				disabled={isPending}
				aria-label={t('settings.teamGeneral.EMOJI_CHANGE', { emoji: valueText })}
				className={cn(buttonVariants({ variant: 'outline' }), 'min-w-20 justify-between')}
			>
				<TriggerFace emoji={value} isPending={isPending} />
				<ChevronDown aria-hidden="true" className="text-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="w-auto overflow-hidden p-0">
				{isOpen && (
					<LazyEmojiPicker
						onEmojiSelect={(picked: PickedEmoji) => save(picked.native)}
						theme={resolvedTheme}
						previewPosition="none"
						skinTonePosition="none"
						maxFrequentRows={1}
						autoFocus
					/>
				)}
				{hasEmoji && (
					<div className="hairline-t border-border p-1">
						<button type="button" onClick={() => save(null)} className={cn(MENU_ROW, MENU_ROW_DESTRUCTIVE)}>
							<Trash aria-hidden="true" />
							{t('settings.teamGeneral.EMOJI_REMOVE')}
						</button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
