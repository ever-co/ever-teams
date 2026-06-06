// 'use client';

// import { TeamsAccountDeletionForm, TeamsPasswordUpdateForm } from '@ever-teams/atoms';
// import { JSX } from 'react';
// import { useTranslations } from 'next-intl';

// export default function SecurityPage(): JSX.Element {
// 	const t = useTranslations('Dashboard');

// 	return (
// 		<section>
// 			<div className="mb-4">
// 				<h1 className="text-2xl font-bold">{t('security')}</h1>
// 				<p className="text-muted-foreground">Manage your account security settings</p>
// 			</div>
// 			<TeamsPasswordUpdateForm className="mb-5 shadow-none  dark:border-gray-700 dark:bg-zinc-950" />
// 			<TeamsAccountDeletionForm className="dark:border-gray-700 dark:bg-zinc-950 " />
// 		</section>
// 	);
// }

'use client';

import { Card, CardContent, CardHeader, CardTitle, Input, Label, Button, ThemedButton } from '@ever-teams/toolkit-ui';
import { Lock, Trash2, Loader2 } from 'lucide-react';
import { useActionState } from 'react';
import { updatePassword, deleteAccount } from '@/app/(login)/actions';
import { useTranslations } from 'next-intl';

type PasswordState = {
	currentPassword?: string;
	newPassword?: string;
	confirmPassword?: string;
	error?: string;
	success?: string;
};

type DeleteState = {
	password?: string;
	error?: string;
	success?: string;
};

export default function SecurityPage() {
	const [passwordState, passwordAction, isPasswordPending] = useActionState<PasswordState, FormData>(
		updatePassword,
		{}
	);

	const [deleteState, deleteAction, isDeletePending] = useActionState<DeleteState, FormData>(deleteAccount, {});
	const t = useTranslations('Dashboard.SecurityPage');

	return (
		<section>
			<div className="mb-4">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<p className="text-muted-foreground">{t('description')}</p>
			</div>
			<Card className="mb-8 shadow-none border dark:border-gray-700 dark:bg-zinc-950">
				<CardHeader>
					<CardTitle>{t('password.title')}</CardTitle>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" action={passwordAction}>
						<div>
							<Label htmlFor="current-password" className="mb-2">
								{t('password.current_label')}
							</Label>
							<Input
								id="current-password"
								name="currentPassword"
								type="password"
								autoComplete="current-password"
								required
								minLength={8}
								maxLength={100}
								defaultValue={passwordState.currentPassword}
							/>
						</div>
						<div>
							<Label htmlFor="new-password" className="mb-2">
								{t('password.new_label')}
							</Label>
							<Input
								id="new-password"
								name="newPassword"
								type="password"
								autoComplete="new-password"
								required
								minLength={8}
								maxLength={100}
								defaultValue={passwordState.newPassword}
							/>
						</div>
						<div>
							<Label htmlFor="confirm-password" className="mb-2">
								{t('password.confirm_label')}
							</Label>
							<Input
								id="confirm-password"
								name="confirmPassword"
								type="password"
								required
								minLength={8}
								maxLength={100}
								defaultValue={passwordState.confirmPassword}
							/>
						</div>
						{passwordState.error && <p className="text-red-500 text-sm">{passwordState.error}</p>}
						{passwordState.success && <p className="text-green-500 text-sm">{passwordState.success}</p>}
						<ThemedButton
							type="submit"
							className="bg-orange-500 hover:bg-orange-600 text-white"
							disabled={isPasswordPending}
						>
							{isPasswordPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t('password.updating')}
								</>
							) : (
								<>
									<Lock className="mr-2 h-4 w-4" />
									{t('password.update_button')}
								</>
							)}
						</ThemedButton>
					</form>
				</CardContent>
			</Card>

			<Card className="shadow-none border dark:border-gray-700 dark:bg-zinc-950">
				<CardHeader>
					<CardTitle>{t('delete_account.title')}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-gray-500 mb-4">{t('delete_account.warning')}</p>
					<form action={deleteAction} className="space-y-4">
						<div>
							<Label htmlFor="delete-password" className="mb-2">
								{t('delete_account.password_label')}
							</Label>
							<Input
								id="delete-password"
								name="password"
								type="password"
								required
								minLength={8}
								maxLength={100}
								defaultValue={deleteState.password}
							/>
						</div>
						{deleteState.error && <p className="text-red-500 text-sm">{deleteState.error}</p>}
						<Button
							type="submit"
							variant="destructive"
							className="bg-red-600 hover:bg-red-700"
							disabled={isDeletePending}
						>
							{isDeletePending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t('delete_account.deleting')}
								</>
							) : (
								<>
									<Trash2 className="mr-2 h-4 w-4" />
									{t('delete_account.delete_button')}
								</>
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</section>
	);
}
