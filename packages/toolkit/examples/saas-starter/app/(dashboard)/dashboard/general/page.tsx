// 'use client';

// import { TeamsProfileForm } from '@ever-teams/atoms';
// import type { ReactElement } from 'react';
// import { useTranslations } from 'next-intl';

// export default function GeneralPage(): ReactElement {
// 	const t = useTranslations('Dashboard');

// 	return (
// 		<section>
// 			<div className="mb-4">
// 				<h1 className="text-2xl font-bold">{t('general')}</h1>
// 				<p className="text-muted-foreground">{t('general_description')}</p>
// 			</div>
// 			<TeamsProfileForm className="border shadow-none p-5 rounded-xl bg-white dark:border-gray-700 dark:bg-zinc-950" />
// 		</section>
// 	);
// }

'use client';

import { useActionState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Label, ThemedButton } from '@ever-teams/toolkit-ui';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
	name?: string;
	error?: string;
	success?: string;
};

type AccountFormProps = {
	state: ActionState;
	nameValue?: string;
	emailValue?: string;
};

function AccountForm({ state, nameValue = '', emailValue = '' }: AccountFormProps) {
	const t = useTranslations('Dashboard.GeneralPage');

	return (
		<>
			<div>
				<Label htmlFor="name" className="mb-2">
					{t('account_info.name_label')}
				</Label>
				<Input
					id="name"
					name="name"
					placeholder={t('account_info.name_placeholder')}
					defaultValue={state.name || nameValue}
					required
				/>
			</div>
			<div>
				<Label htmlFor="email" className="mb-2">
					{t('account_info.email_label')}
				</Label>
				<Input
					id="email"
					name="email"
					type="email"
					placeholder={t('account_info.email_placeholder')}
					defaultValue={emailValue}
					required
				/>
			</div>
		</>
	);
}

function AccountFormWithData({ state }: { state: ActionState }) {
	const { data: user } = useSWR<User>('/api/user', fetcher);
	return <AccountForm state={state} nameValue={user?.name ?? ''} emailValue={user?.email ?? ''} />;
}

export default function GeneralPage() {
	const [state, formAction, isPending] = useActionState<ActionState, FormData>(updateAccount, {});
	const t = useTranslations('Dashboard.GeneralPage');

	return (
		<section>
			<div className="mb-4">
				<h1 className="text-2xl font-bold">{t('title')}</h1>
				<p className="text-muted-foreground">{t('description')}</p>
			</div>
			<Card className="shadow-none border dark:border-gray-700 dark:bg-zinc-950">
				<CardHeader>
					<CardTitle>{t('account_info.title')}</CardTitle>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" action={formAction}>
						<Suspense fallback={<AccountForm state={state} />}>
							<AccountFormWithData state={state} />
						</Suspense>
						{state.error && <p className="text-red-500 text-sm">{state.error}</p>}
						{state.success && <p className="text-green-500 text-sm">{state.success}</p>}
						<ThemedButton
							type="submit"
							className="bg-blue-700 hover:bg-blue-900 text-white"
							disabled={isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t('account_info.saving')}
								</>
							) : (
								t('account_info.save_button')
							)}
						</ThemedButton>
					</form>
				</CardContent>
			</Card>
		</section>
	);
}
