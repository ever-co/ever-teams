import React, { useEffect, useState, type FormEvent } from 'react';

import Notice from '~components/shared/Notice';
import { apiOriginOf } from '~lib/api-client';
import { t } from '~lib/i18n';
import { clearSession, DEFAULT_API_URL, DEFAULT_APP_URL, loadSettings, saveSettings } from '~lib/session-store';
import { primaryButton, roundInput } from '~misc/tailwindClasses';

import './style.css';

// A local server may be plain http; every other address must be https
const ALLOWED_ADDRESS = /^(https:\/\/[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)(\/\S*)?$/i;

function isAllowedAddress(value: string): boolean {
	return ALLOWED_ADDRESS.test(value.trim());
}

type SaveState = 'idle' | 'saved' | 'invalid';

/** Where the extension talks to: the API (the hosted one by default) and the web app the popup opens. */
function Options() {
	const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
	const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL);
	const [savedApiUrl, setSavedApiUrl] = useState(DEFAULT_API_URL);
	const [state, setState] = useState<SaveState>('idle');

	useEffect(() => {
		void loadSettings().then((settings) => {
			setApiUrl(settings.apiUrl);
			setAppUrl(settings.appUrl);
			setSavedApiUrl(settings.apiUrl);
		});
	}, []);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const bothAllowed = isAllowedAddress(apiUrl) && isAllowedAddress(appUrl);
		if (!bothAllowed) {
			setState('invalid');
			return;
		}
		const nextApiUrl = apiOriginOf(apiUrl);
		const apiChanged = nextApiUrl !== apiOriginOf(savedApiUrl);
		await saveSettings({ apiUrl: nextApiUrl, appUrl: appUrl.trim().replace(/\/+$/, '') });
		// A session belongs to the API that opened it
		if (apiChanged) {
			await clearSession();
		}
		setApiUrl(nextApiUrl);
		setSavedApiUrl(nextApiUrl);
		setState('saved');
	};

	return (
		<main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
			<form
				onSubmit={onSubmit}
				className="mx-auto flex max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10"
			>
				<h1 className="text-xl font-semibold">{t('optionsTitle')}</h1>
				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium" htmlFor="api-url">
						{t('optionsApiUrl')}
					</label>
					<input
						id="api-url"
						className={roundInput}
						value={apiUrl}
						onChange={(event) => {
							setApiUrl(event.target.value);
							setState('idle');
						}}
					/>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">{t('optionsApiUrlHint')}</p>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium" htmlFor="app-url">
						{t('optionsAppUrl')}
					</label>
					<input
						id="app-url"
						className={roundInput}
						value={appUrl}
						onChange={(event) => {
							setAppUrl(event.target.value);
							setState('idle');
						}}
					/>
				</div>
				<p className="text-xs text-zinc-500 dark:text-zinc-400">{t('optionsSignedOutNote')}</p>
				{state === 'invalid' && <Notice tone="error">{t('optionsInvalidUrl')}</Notice>}
				{state === 'saved' && <Notice tone="info">{t('optionsSaved')}</Notice>}
				<button type="submit" className={`${primaryButton} self-start`}>
					{t('optionsSave')}
				</button>
			</form>
		</main>
	);
}

export default Options;
