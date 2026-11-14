import logoImg from 'data-base64:~assets/logo/ever-teams-dark.png';
import React, { useState, type FC, type FormEvent } from 'react';

import Notice from '~components/shared/Notice';
import { SpinnerIcon } from '~components/shared/Icons';
import { ApiError } from '~lib/api-client';
import { confirmSignInCode, enterWorkspace, sendSignInCode } from '~lib/gauzy';
import { t } from '~lib/i18n';
import { refusalOf } from '~lib/refusal';
import type { Session, WorkspaceChoice } from '~lib/workspaces';
import { inheritTextSize, primaryButton, roundInput } from '~misc/tailwindClasses';

interface SignInProps {
	apiUrl: string;
	onSignedIn: (session: Session) => Promise<void>;
	onOpenSettings: () => void;
}

type Step = 'email' | 'code' | 'workspace';

/** The words for a failed sign-in step: a refused code says so, anything else as everywhere in the popup. */
function signInErrorOf(error: unknown, step: Step): string {
	if (error instanceof ApiError) {
		const isRefusedCode = step === 'code' && (error.status === 400 || error.status === 401);
		if (isRefusedCode) {
			return t('signInWrongCode');
		}
		const refusal = refusalOf(error);
		return t(refusal.key, refusal.reason);
	}
	return t('errorGeneric');
}

/** The label of a button: its busy words while it works. */
function labelWhile(busy: boolean, busyKey: string, idleKey: string): string {
	if (busy) {
		return t(busyKey);
	}
	return t(idleKey);
}

/** Sign-in with the email code of the web: email, then the code sent to it, then the workspace when there are several. */
export const SignIn: FC<SignInProps> = ({ apiUrl, onSignedIn, onOpenSettings }) => {
	const [step, setStep] = useState<Step>('email');
	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [workspaces, setWorkspaces] = useState<WorkspaceChoice[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const enter = async (workspace: WorkspaceChoice) => {
		const session = await enterWorkspace(apiUrl, email.trim(), workspace);
		if (!session) {
			setError(t('errorGeneric'));
			return;
		}
		await onSignedIn(session);
	};

	const run = async (work: () => Promise<void>) => {
		setBusy(true);
		setError(null);
		try {
			await work();
		} catch (failure) {
			setError(signInErrorOf(failure, step));
		} finally {
			setBusy(false);
		}
	};

	const onSubmitEmail = (event: FormEvent) => {
		event.preventDefault();
		void run(async () => {
			await sendSignInCode(apiUrl, email.trim());
			setStep('code');
		});
	};

	const onSubmitCode = (event: FormEvent) => {
		event.preventDefault();
		void run(async () => {
			const found = await confirmSignInCode(apiUrl, email.trim(), code.trim());
			if (found.length === 0) {
				setError(t('signInNoWorkspace'));
				return;
			}
			if (found.length === 1) {
				await enter(found[0]);
				return;
			}
			setWorkspaces(found);
			setStep('workspace');
		});
	};

	const onPickWorkspace = (workspace: WorkspaceChoice) => {
		void run(() => enter(workspace));
	};

	const restart = () => {
		setStep('email');
		setCode('');
		setWorkspaces([]);
		setError(null);
	};

	return (
		<div className="flex flex-col gap-4">
			<img className="h-6 w-auto self-start dark:invert" src={logoImg} alt="Ever Teams" />
			<div className="flex flex-col gap-1">
				<h1 className="text-base font-semibold">{t('signInTitle')}</h1>
				{step === 'code' && (
					<p className="text-xs text-zinc-500 dark:text-zinc-400">{t('signInCodeSent', email.trim())}</p>
				)}
				{step === 'workspace' && (
					<p className="text-xs text-zinc-500 dark:text-zinc-400">{t('signInChooseWorkspace')}</p>
				)}
			</div>

			{step === 'email' && (
				<form className="flex flex-col gap-2" onSubmit={onSubmitEmail}>
					<label className="text-sm font-medium" htmlFor="sign-in-email">
						{t('signInEmailLabel')}
					</label>
					<input
						id="sign-in-email"
						type="email"
						required
						autoComplete="email"
						autoFocus
						className={roundInput}
						placeholder={t('signInEmailPlaceholder')}
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
					<button type="submit" className={primaryButton} disabled={busy || !email.trim()}>
						{busy && <SpinnerIcon className="h-4 w-4" />}
						{labelWhile(busy, 'signInSending', 'signInSendCode')}
					</button>
				</form>
			)}

			{step === 'code' && (
				<form className="flex flex-col gap-2" onSubmit={onSubmitCode}>
					<label className="text-sm font-medium" htmlFor="sign-in-code">
						{t('signInCodeLabel')}
					</label>
					<input
						id="sign-in-code"
						required
						autoComplete="one-time-code"
						autoFocus
						className={roundInput}
						value={code}
						onChange={(event) => setCode(event.target.value)}
					/>
					<button type="submit" className={primaryButton} disabled={busy || !code.trim()}>
						{busy && <SpinnerIcon className="h-4 w-4" />}
						{labelWhile(busy, 'signInConfirming', 'signInConfirm')}
					</button>
				</form>
			)}

			{step === 'workspace' && (
				<ul className="flex flex-col gap-1.5">
					{workspaces.map((workspace) => (
						<li key={workspace.token}>
							<button
								type="button"
								disabled={busy}
								onClick={() => onPickWorkspace(workspace)}
								className="w-full truncate rounded-lg px-3 py-2 text-start text-sm ring-1 ring-zinc-900/10 hover:bg-zinc-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 dark:ring-white/15 dark:hover:bg-white/5"
							>
								{workspace.name || workspace.teams[0]?.name}
							</button>
						</li>
					))}
				</ul>
			)}

			{error && <Notice tone="error">{error}</Notice>}

			<div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
				{step === 'email' && (
					<span className={`truncate ${inheritTextSize}`} title={apiUrl}>
						{apiUrl}
					</span>
				)}
				{step !== 'email' && (
					<button type="button" className="underline underline-offset-2 hover:no-underline" onClick={restart}>
						{t('signInOtherEmail')}
					</button>
				)}
				<button
					type="button"
					className="underline underline-offset-2 hover:no-underline"
					onClick={onOpenSettings}
				>
					{t('headerSettings')}
				</button>
			</div>
		</div>
	);
};

export default SignIn;
