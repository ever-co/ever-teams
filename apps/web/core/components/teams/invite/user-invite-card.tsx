import { useSendTeamInvitation } from '@/core/hooks/invitations/use-send-team-invitation';
import { useRemoveTeamInvitation } from '@/core/hooks/invitations/use-remove-team-invitation';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { DragHandle, Mail, MoreVertical, Send, Trash } from '@/core/components/icons';
import { Button, ConfirmDropdown, SpinnerLoader, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { TimerStatus } from '@/core/components/timer/timer-status';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { Avatar } from '../../duplicated-components/avatar';
import { Tooltip } from '../../duplicated-components/tooltip';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { cn } from '@/core/lib/helpers';
import { TInvite } from '@/core/types/schemas';
import { InviteStatusDisplayMap } from '@/core/constants/config/constants';
import { EInviteStatus } from '@/core/types/generics/enums/invite';
import type { CSSProperties } from 'react';
import {
	MEMBER_CARD_PADDING,
	MEMBER_CELL,
	MEMBER_CELL_CENTER,
	MEMBER_FIRST_CELL,
	MEMBER_GRID_FROM,
	MEMBER_MENU_CELL,
	MEMBER_CARD_MIN_HEIGHT,
	MEMBER_ROW_GRID,
	MEMBER_ROW_MIN_HEIGHT,
	MEMBER_STACK_UNTIL
} from '../member-row-grid';
import {
	MENU_ANCHOR,
	MENU_ANCHORED_PANEL,
	MENU_ROW,
	MENU_ROW_DESTRUCTIVE,
	MENU_SEPARATOR,
	MENU_SURFACE
} from '@/core/components/common/menu-recipes';
import { toastMoment } from '@/core/components/common/toast-moment';

type Props = IClassName & { invitation: TInvite };

const ROW_DRAG_HANDLE =
	'absolute -left-3.5 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground/60 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100';

export function InvitedCard({ invitation, className }: Props) {
	const t = useTranslations();

	const { foreground: statusColor, label } = InviteStatusDisplayMap[invitation.status as EInviteStatus];
	const statusChipStyle = { '--chip': statusColor } as CSSProperties;

	return (
		<div className="group/row">
			<div className={clsxm(MEMBER_GRID_FROM, MEMBER_CARD_PADDING, 'py-2', className)}>
				<div className={cn(MEMBER_ROW_GRID, MEMBER_ROW_MIN_HEIGHT, 'relative')}>
					<div className={ROW_DRAG_HANDLE}>
						<DragHandle className="size-3.5" />
					</div>

					<div className={cn(MEMBER_FIRST_CELL, 'gap-3')}>
						<Avatar
							size={36}
							className="relative shrink-0 opacity-60"
							imageTitle={invitation.fullName ?? ''}
						>
							<TimerStatus
								status={ETimerStatus.IDLE}
								showIcon={false}
								className="absolute -bottom-0.5 -right-0.5 size-2.5 ring-2 ring-card"
							/>
						</Avatar>

						<div className="flex min-w-0 flex-col gap-0.5">
							<div className="flex min-w-0 items-center gap-2">
								<Text.Heading className="truncate text-sm font-medium text-foreground/70" as="h3">
									{invitation.fullName}
								</Text.Heading>
								<span
									style={statusChipStyle}
									className="chip-3d inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium"
								>
									{label}
								</span>
							</div>

							<Text className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
								<Mail className="size-3.5 shrink-0" />
								<span className="truncate">{invitation.email}</span>
							</Text>
						</div>
					</div>

					<div className={cn(MEMBER_CELL, PENDING_VALUE)}>{t('common.TASK_TITTLE')}</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER, PENDING_VALUE)}>{NO_VALUE}</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER, PENDING_VALUE)}>{NO_VALUE}</div>
					<div className={cn(MEMBER_CELL, MEMBER_CELL_CENTER, PENDING_VALUE)}>{NO_VALUE}</div>

					<div className={MEMBER_MENU_CELL}>
						<RemoveUserInviteMenu invitation={invitation} />
					</div>
				</div>
			</div>
			<div className={clsxm('relative flex flex-col px-4 py-3', MEMBER_STACK_UNTIL, className)}>
				<div className="mb-3 flex items-center gap-3 pr-8">
					<Avatar size={36} className="relative shrink-0 opacity-60" imageTitle={invitation.fullName ?? ''}>
						<TimerStatus
							status={ETimerStatus.IDLE}
							showIcon={false}
							className="absolute -bottom-0.5 -right-0.5 size-2.5 ring-2 ring-card"
						/>
					</Avatar>
					<div className="flex min-w-0 flex-col gap-0.5">
						<div className="flex min-w-0 items-center gap-2">
							<Text.Heading as="h3" className="truncate text-sm font-medium text-foreground/70">
								{invitation.fullName}
							</Text.Heading>
							<span
								style={statusChipStyle}
								className="chip-3d inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium"
							>
								{label}
							</span>
						</div>
						<Text className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
							<Mail className="size-3.5 shrink-0" />
							<span className="truncate">{invitation.email}</span>
						</Text>
					</div>
				</div>
				<Text className={cn(PENDING_VALUE, 'hairline-t border-dashed border-border pt-3')}>
					{t('common.TASK_TITTLE')}
				</Text>
				<div className="absolute right-2 top-3">
					<RemoveUserInviteMenu invitation={invitation} />
				</div>
			</div>
		</div>
	);
}

const PENDING_VALUE = 'text-sm text-muted-foreground/70';
const NO_VALUE = '\u2013';

export function RemoveUserInviteMenu({ invitation }: Props) {
	const t = useTranslations();
	const { resendTeamInvitation, resendInviteLoading } = useSendTeamInvitation();
	const { removeTeamInvitation, removeInviteLoading } = useRemoveTeamInvitation();

	const loading = removeInviteLoading || resendInviteLoading;

	return (
		<Popover className="relative">
			{!loading && (
				<PopoverButton
					aria-label={t('common.MORE_OPTIONS')}
					className={clsxm(
						buttonVariants({ variant: 'ghost', size: 'icon' }),
						'text-muted-foreground data-open:bg-foreground/5'
					)}
				>
					<MoreVertical className="size-4" />
				</PopoverButton>
			)}
			{loading && <SpinnerLoader size={20} />}

			<PopoverPanel anchor={MENU_ANCHOR} transition className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}>
				{({ close }) => {
					return (
						<ul className="flex flex-col">
							<li>
								<button
									onClick={async () => {
										try {
											await resendTeamInvitation(invitation.id || '');
											toastMoment(
												t('toasts.invites.SENT', { email: invitation.email }),
												<Send />
											);
											close();
										} catch {
											// The global mutation fallback reports the failure
										}
									}}
									className={MENU_ROW}
								>
									<Send />
									{t('common.RESEND_INVITATION')}
								</button>
							</li>
							<li role="separator" className={MENU_SEPARATOR} />
							<li>
								<ConfirmDropdown
									onConfirm={async () => {
										try {
											await removeTeamInvitation(invitation.id || '', invitation.email || '');
											close();
										} catch {
											// useRemoveTeamInvitation reports the failure
										}
									}}
								>
									<span className={cn(MENU_ROW, MENU_ROW_DESTRUCTIVE)}>
										<Trash />
										{t('common.REMOVE')}
									</span>
								</ConfirmDropdown>
							</li>
						</ul>
					);
				}}
			</PopoverPanel>
		</Popover>
	);
}

export function InviteUserTeamCard({
	className,
	onClick,
	active = true
}: IClassName & { onClick?: () => void; active?: boolean }) {
	const t = useTranslations();

	return (
		<div className={clsxm(MEMBER_CARD_MIN_HEIGHT, 'flex w-full items-center gap-3 px-4 py-2', className)}>
			<div className="size-9 shrink-0 rounded-full hairline-border border-dashed border-foreground/25" />

			<Tooltip
				enabled={!active}
				label={t('common.VERIFY_ACCOUNT_MSG')}
				placement="top-start"
				className="inline-block"
			>
				<Button
					variant="outline"
					size="default"
					className="min-w-[3.125rem] md:min-w-[5.625rem]"
					disabled={!active}
					onClick={onClick}
				>
					{t('common.INVITE')}
				</Button>
			</Tooltip>
		</div>
	);
}
