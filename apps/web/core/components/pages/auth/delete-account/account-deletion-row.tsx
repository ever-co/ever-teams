'use client';

import { useTranslations } from 'next-intl';
import { Alert, Building, UserRemove } from '@/core/components/icons';
import { leavesWorkspaceWithoutAdmin, type IAccountDeletionAccount } from '@/core/lib/auth/account-deletion';
import { cn } from '@/core/lib/helpers';

/** `SUPER_ADMIN` → `Super admin`. */
function roleLabel(role?: string | null): string | null {
	if (!role) return null;
	const words = role.toLowerCase().replace(/_/g, ' ');
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * One account (one workspace) of an account deletion and what happens to it: the e-mail link's confirm page lists
 * every account of the address, the Danger Zone's "Delete all data" modal shows the current one.
 */
export function AccountDeletionRow({ account }: Readonly<{ account: IAccountDeletionAccount }>) {
	const t = useTranslations();
	const workspaceDeleted = account.outcome === 'workspace-deleted';
	const role = roleLabel(account.role);
	const organizations = account.organizations?.filter(Boolean) ?? [];

	return (
		<li className="p-3 rounded-lg bg-foreground/3" data-testid="delete-account-row">
			<div className="flex gap-3 items-start">
				<div
					className={cn(
						'flex justify-center items-center mt-0.5 size-8 rounded-md shrink-0',
						workspaceDeleted && 'bg-destructive/10 text-destructive-ink',
						!workspaceDeleted && 'bg-foreground/5 text-muted-foreground'
					)}
				>
					{workspaceDeleted && <Building className="size-4" />}
					{!workspaceDeleted && <UserRemove className="size-4" />}
				</div>
				<div className="space-y-1 min-w-0">
					<p className="flex flex-wrap gap-2 items-center text-sm font-medium text-foreground">
						<span className="break-all">{account.workspace}</span>
						{role && (
							<span className="px-1.5 py-0.5 text-[11px] font-medium rounded-sm bg-foreground/5 text-muted-foreground">
								{role}
							</span>
						)}
					</p>
					{organizations.length > 0 && (
						<p className="text-xs text-muted-foreground">
							{t('pages.accountDeletion.ORGANIZATIONS', { organizations: organizations.join(', ') })}
						</p>
					)}
					<p className="text-xs text-foreground/80" data-outcome={account.outcome}>
						{workspaceDeleted
							? t('pages.accountDeletion.OUTCOME_WORKSPACE_DELETED')
							: t('pages.accountDeletion.OUTCOME_ACCOUNT_REMOVED', {
									count: account.otherMembers ?? 0
								})}
					</p>
					{leavesWorkspaceWithoutAdmin(account) && (
						<p
							className="flex gap-1.5 items-start p-2 mt-1 text-xs rounded-md bg-warning/10 text-warning-foreground"
							role="alert"
							data-testid="delete-account-sole-admin"
						>
							<Alert className="mt-px size-3.5 shrink-0" />
							<span>
								{t('pages.accountDeletion.SOLE_ADMIN_WARNING', { count: account.otherMembers ?? 0 })}
							</span>
						</p>
					)}
				</div>
			</div>
		</li>
	);
}
