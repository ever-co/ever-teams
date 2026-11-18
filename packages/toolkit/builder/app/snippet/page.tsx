'use client';

import { createElement, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { MainLayout } from '../../components/layouts';
import { useBuilderApiUrl } from '../providers';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	DEFAULT_API_URL,
	previewAttributes,
	timerSnippet,
	type TimerColorScheme,
	type TimerLanguage
} from '../../libs/timer-snippet';

const COPIED_FOR_MS = 2000;

type CopyState = 'idle' | 'copied' | 'refused';

function colorSchemeOf(value: string): TimerColorScheme {
	if (value === 'light') {
		return value;
	}
	if (value === 'dark') {
		return value;
	}
	return 'system';
}

function languageOf(value: string): TimerLanguage {
	if (value === 'fr') {
		return value;
	}
	return 'en';
}

// Defines <ever-teams-timer> in this page, for the preview: the same element the snippet loads.
function useTimerElement() {
	useEffect(() => {
		void import('@ever-teams/embed');
	}, []);
}

function CopyLabel({ state }: Readonly<{ state: CopyState }>) {
	if (state === 'copied') {
		return (
			<>
				<Check className="h-4 w-4" aria-hidden />
				Copied
			</>
		);
	}
	return (
		<>
			<Copy className="h-4 w-4" aria-hidden />
			Copy
		</>
	);
}

export default function SnippetPage() {
	const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
	const [colorScheme, setColorScheme] = useState<TimerColorScheme>('system');
	const [lang, setLang] = useState<TimerLanguage>('en');
	const [copyState, setCopyState] = useState<CopyState>('idle');
	const builderApiUrl = useBuilderApiUrl();
	useTimerElement();

	const options = { apiUrl, colorScheme, lang };
	const snippet = timerSnippet(options);

	const copySnippet = async () => {
		try {
			await navigator.clipboard.writeText(snippet);
			setCopyState('copied');
			setTimeout(() => setCopyState('idle'), COPIED_FOR_MS);
		} catch {
			setCopyState('refused');
		}
	};

	return (
		<MainLayout childrenClassName="mx-auto max-w-5xl">
			<header className="mb-8 flex flex-col gap-2">
				<h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Embed a timer</h1>
				<p className="max-w-2xl text-lg text-slate-500 dark:text-slate-400">
					Put an Ever Teams timer on any website: one script and one element, with nothing to install or
					build.
				</p>
			</header>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Settings</CardTitle>
						<CardDescription>The snippet and the preview follow them.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-5">
						<div className="flex flex-col gap-2">
							<Label htmlFor="timer-api-url">Ever Teams API address</Label>
							<Input
								id="timer-api-url"
								inputMode="url"
								value={apiUrl}
								placeholder={DEFAULT_API_URL}
								onChange={(event) => setApiUrl(event.target.value)}
							/>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Your own server&apos;s address ending in /api, or leave the default one.
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="timer-color-scheme">Color scheme</Label>
							<Select value={colorScheme} onValueChange={(value) => setColorScheme(colorSchemeOf(value))}>
								<SelectTrigger id="timer-color-scheme">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="system">Follows the visitor&apos;s system</SelectItem>
									<SelectItem value="light">Light</SelectItem>
									<SelectItem value="dark">Dark</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="timer-language">Language</Label>
							<Select value={lang} onValueChange={(value) => setLang(languageOf(value))}>
								<SelectTrigger id="timer-language">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="en">English</SelectItem>
									<SelectItem value="fr">French</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Preview</CardTitle>
						<CardDescription>
							The timer as your visitors see it, signed in to this builder&apos;s Ever Teams server. The
							snippet uses the address you set.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="min-h-28 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
							{createElement('ever-teams-timer', previewAttributes(options, builderApiUrl))}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="mt-6">
				<CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
					<div className="flex flex-col gap-1.5">
						<CardTitle>Snippet</CardTitle>
						<CardDescription>Paste it where the timer goes.</CardDescription>
					</div>
					<Button variant="outline" size="sm" className="gap-2" onClick={copySnippet}>
						<CopyLabel state={copyState} />
					</Button>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<CodeBlock language="markup" code={snippet} />
					{copyState === 'refused' && (
						<output className="block text-sm text-red-600 dark:text-red-400">
							The browser refused to copy: select the snippet and copy it yourself.
						</output>
					)}
					<ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
						<li>
							Serve the files of the dist/ folder of @ever-teams/embed from your site, under /ever-teams/.
							The package is not published on npm yet: build it from the Ever Teams repository.
						</li>
						<li>Paste the snippet where the timer goes.</li>
						<li>Ask your Ever Teams administrator to allow your site&apos;s address.</li>
					</ol>
				</CardContent>
			</Card>
		</MainLayout>
	);
}
