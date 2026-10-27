'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Building2, UserMinus } from 'lucide-react';
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
export function AccountDeletionRow({ account }: { account: IAccountDeletionAccount }) {
	const t = useTranslations();
	const workspaceDeleted = account.outcome === 'workspace-deleted';
	const role = roleLabel(account.role);
	const organizations = account.organizations?.filter(Boolean) ?? [];

	return (
		<li className="p-3 rounded-lg ring-1 ring-foreground/10 bg-muted/30" data-testid="delete-account-row">
			<div className="flex gap-3 items-start">
				<div
					className={cn(
						'flex justify-center items-center mt-0.5 w-8 h-8 rounded-md shrink-0',
						workspaceDeleted ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
					)}
				>
					{workspaceDeleted ? <Building2 className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
				</div>
				<div className="space-y-1 min-w-0">
					<p className="flex flex-wrap gap-2 items-center text-sm font-medium text-foreground">
						<span className="break-all">{account.workspace}</span>
						{role && (
							<span className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-muted text-muted-foreground">
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
							className="flex gap-1.5 items-start p-2 mt-1 text-xs rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300"
							role="alert"
							data-testid="delete-account-sole-admin"
						>
							<AlertTriangle className="mt-px w-3.5 h-3.5 shrink-0" />
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
