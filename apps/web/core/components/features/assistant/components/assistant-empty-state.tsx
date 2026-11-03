'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Bot, Key } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { ASSISTANT_COLUMN } from '../assistant-helpers';
import { ASSISTANT_EXAMPLES } from '../assistant-examples';
import { PromptSuggestion } from '../prompt-kit/prompt-suggestion';

function MissingKeyNotice({ onOpenConfig }: Readonly<{ onOpenConfig: () => void }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-3 rounded-xl bg-card p-3.5 text-left shadow-sm shadow-black/6.5 hairline-ring ring-border sm:flex-row sm:items-center">
			<div className="flex min-w-0 flex-1 items-start gap-3">
				<span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground keycap-3d">
					<Key className="size-4" aria-hidden="true" />
				</span>
				<div className="min-w-0">
					<p className="text-[13px] font-medium text-foreground">{t('chatView.NO_KEY_TITLE')}</p>
					<p className="mt-0.5 text-xs text-muted-foreground">{t('chatView.NO_KEY_DESCRIPTION')}</p>
				</div>
			</div>
			<Button
				type="button"
				className="shrink-0 self-start rounded-full text-[13px] sm:self-auto"
				onClick={onOpenConfig}
			>
				{t('chatView.CONFIGURE_BUTTON')}
			</Button>
		</div>
	);
}

type AssistantWelcomeProps = {
	isConfigured: boolean;
	onOpenConfig: () => void;
};

export function AssistantWelcome({ isConfigured, onOpenConfig }: Readonly<AssistantWelcomeProps>) {
	const t = useTranslations();
	return (
		<div className="flex flex-1 flex-col justify-end px-4 pt-10 pb-6">
			<div className={cn(ASSISTANT_COLUMN, 'flex flex-col gap-6')}>
				<div className="flex flex-col items-center gap-3 text-center">
					<span className="flex size-9 items-center justify-center rounded-lg text-muted-foreground keycap-3d">
						<Bot className="size-5" aria-hidden="true" />
					</span>
					<h1 className="text-2xl font-semibold text-balance text-foreground">{t('chatView.EMPTY_TITLE')}</h1>
				</div>
				{!isConfigured && <MissingKeyNotice onOpenConfig={onOpenConfig} />}
			</div>
		</div>
	);
}

type AssistantExamplesProps = {
	onPickExample: (prompt: string) => void;
};

export function AssistantExamples({ onPickExample }: Readonly<AssistantExamplesProps>) {
	const t = useTranslations();
	return (
		<section aria-labelledby="assistant-examples-label" className="flex-1 px-4 pt-5 pb-10">
			<div className={cn(ASSISTANT_COLUMN, 'flex flex-col items-center gap-3')}>
				<h2 id="assistant-examples-label" className="text-[13px] text-muted-foreground">
					{t('chatView.EXAMPLES_LABEL')}
				</h2>
				<div className="flex flex-wrap justify-center gap-2">
					{ASSISTANT_EXAMPLES.map((example) => {
						const ExampleIcon = example.icon;
						const prompt = t(example.promptKey);
						const handlePick = () => onPickExample(prompt);
						return (
							<PromptSuggestion key={example.id} onClick={handlePick}>
								<ExampleIcon className="size-4 text-muted-foreground" aria-hidden="true" />
								{t(example.labelKey)}
							</PromptSuggestion>
						);
					})}
				</div>
			</div>
		</section>
	);
}
