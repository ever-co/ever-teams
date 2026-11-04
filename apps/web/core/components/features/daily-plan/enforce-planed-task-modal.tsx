import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { DialogTitle } from '@/core/components/common/dialog';
import { HueIconTile } from '@/core/components/common/value-glyphs';
import { TaskDaily } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

interface IEnforcePlannedTaskModalProps {
	open: boolean;
	/** "No": the timer's own way out, which may still open today's plan. */
	closeModal: () => void;
	content: ReactNode;
	/** "Yes": the owner puts the task in today's plan and shows that plan. */
	onConfirm: () => void;
}

export function EnforcePlanedTaskModal(props: IEnforcePlannedTaskModalProps) {
	const { closeModal, open, content, onConfirm } = props;
	const t = useTranslations();

	return (
		<AppDialog open={open} onClose={closeModal} width="sm" keepOpenOnOutsideClick>
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col items-start py-5')}>
				<HueIconTile hue="primary" className="size-9 rounded-[10px] [&_svg]:size-4.5">
					<TaskDaily />
				</HueIconTile>
				<DialogTitle className="mt-3 text-[15px] font-semibold text-balance text-foreground">
					{content}
				</DialogTitle>
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button type="button" variant="ghost" size="default" onClick={closeModal} className="ml-auto">
					{t('common.NO')}
				</Button>
				<Button type="button" size="default" onClick={onConfirm} data-initial-focus="">
					{t('common.YES')}
				</Button>
			</div>
		</AppDialog>
	);
}
