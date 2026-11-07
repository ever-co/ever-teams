'use client';

import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { useChatActions } from '@/core/hooks/chat/use-chat-actions';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { teamDefaultProjectId } from '@/core/lib/helpers/team-default-project';
import { CHAT_TASK_TITLE_MAX, chatTaskTitleOf } from '@/core/lib/utils/chat-task';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { IChatMessage } from '@/core/types/interfaces/common/chat';

/**
 * "Create task" on a message: the title is the message's first line (editable), the task goes to the active team and
 * the project the team files new tasks under, the message becomes its description and keeps a card pointing to it.
 * Mounted per message (the parent keys it), so each opening starts from that message's text.
 */
export function CreateTaskFromMessageDialog({ message, onClose }: Readonly<{ message: IChatMessage; onClose: () => void }>) {
	const t = useTranslations();
	const actions = useChatActions();
	const { openTaskDrawer } = useTaskDrawer();
	const team = useAtomValue(activeTeamState);
	const [title, setTitle] = useState(() => chatTaskTitleOf(message.body));
	const [busy, setBusy] = useState(false);
	const value = title.trim();

	const create = async () => {
		if (!value || busy) return;
		setBusy(true);
		try {
			const projectId = teamDefaultProjectId(team);
			const task = await actions.createTask(message, {
				title: value,
				...(team?.id ? { organizationTeamId: team.id } : {}),
				...(projectId ? { projectId } : {})
			});
			onClose();
			toast(t('teamChat.TASK_CREATED'), { action: { label: t('teamChat.OPEN'), onClick: () => openTaskDrawer(task.id) } });
		} catch (error) {
			toast.error(errorStatusOf(error) === 403 ? t('teamChat.TASK_CREATE_FORBIDDEN') : t('teamChat.TASK_CREATE_FAILED'));
			setBusy(false);
		}
	};

	return (
		<Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
			<DialogContent>
				<form
					className="flex flex-col gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						void create();
					}}
				>
					<DialogHeader>
						<DialogTitle>{t('teamChat.CREATE_TASK_TITLE')}</DialogTitle>
						<DialogDescription>
							{team?.name ? t('teamChat.CREATE_TASK_TEXT_TEAM', { team: team.name }) : t('teamChat.CREATE_TASK_TEXT')}
						</DialogDescription>
					</DialogHeader>
					<Input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						maxLength={CHAT_TASK_TITLE_MAX}
						placeholder={t('teamChat.TASK_TITLE')}
						aria-label={t('teamChat.TASK_TITLE')}
						autoFocus
					/>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose} disabled={busy}>
							{t('teamChat.CANCEL')}
						</Button>
						<Button type="submit" disabled={!value || busy}>
							{t('teamChat.CREATE_TASK')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
