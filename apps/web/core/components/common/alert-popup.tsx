import React from 'react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { ToastOrb } from './toast-orb';
import { Trash } from '@/core/components/icons';

interface IConfirmPopup {
	buttonOpen: React.ReactElement;
	open: boolean;
}

/**
 * The confirmation anchored to "Delete this plan": what goes and what stays, then the caller's buttons
 * (the destructive one, then Cancel).
 */
export function AlertPopup({ children, buttonOpen, open }: React.PropsWithChildren<IConfirmPopup>) {
	const t = useTranslations();

	return (
		<Popover open={open}>
			<PopoverTrigger asChild>{buttonOpen}</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-3.5">
				<div className="flex flex-col gap-3">
					<div className="flex items-start gap-2.5">
						<span className="flex h-5 shrink-0 items-center">
							<ToastOrb tone="error" glyph={<Trash />} size="sm" />
						</span>
						<div className="flex min-w-0 flex-col gap-0.5">
							<h4 className="text-[13px] font-medium leading-5 text-foreground text-balance">
								{t('common.plan.DELETE_THIS_PLAN')}
							</h4>
							<p className="text-xs leading-snug text-muted-foreground text-pretty">
								{t('common.plan.DELETE_PLAN_CONFIRM')}
							</p>
						</div>
					</div>
					<div className="flex flex-row-reverse justify-start gap-2">{children}</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
