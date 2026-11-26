'use client';

import { useId } from 'react';
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
		<div className="flex flex-col gap-3 rounded-xl bg-card p-4 text-start shadow-sm shadow-black/6.5 hairline-ring ring-border @md:flex-row @md:items-center">
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
				className="shrink-0 self-start rounded-full text-[13px] @md:self-auto"
				onClick={onOpenConfig}
			>
				{t('chatView.CONFIGURE_BUTTON')}
			</Button>
		</div>
	);
}

/** The full page (`/assistant`) or the Ever SI panel beside a page, where the heading sits under the panel's title. */
export type AssistantSurface = 'page' | 'panel';

const WELCOME_SPACING: Record<AssistantSurface, string> = { page: 'pt-10 pb-6', panel: 'pt-8 pb-4' };
const EXAMPLES_SPACING: Record<AssistantSurface, string> = { page: 'flex-1 pt-5 pb-10', panel: 'py-4' };
const EXAMPLES_LABEL_TAG = { page: 'h2', panel: 'h3' } as const;

type AssistantWelcomeProps = {
	isConfigured: boolean;
	onOpenConfig: () => void;
	surface?: AssistantSurface;
};

function WelcomeTitle({ surface }: Readonly<{ surface: AssistantSurface }>) {
	const t = useTranslations();
	const title = t('chatView.EMPTY_TITLE');
	if (surface === 'panel') {
		return <h3 className="text-lg font-medium text-balance text-foreground">{title}</h3>;
	}
	return <h1 className="text-2xl font-medium text-balance text-foreground">{title}</h1>;
}

export function AssistantWelcome({ isConfigured, onOpenConfig, surface = 'page' }: Readonly<AssistantWelcomeProps>) {
	return (
		<div className={cn('flex flex-1 flex-col justify-end px-4', WELCOME_SPACING[surface])}>
			{/* The notice lays out by the room it has, the page's column or the panel, not by the window. */}
			<div className={cn(ASSISTANT_COLUMN, 'flex flex-col gap-6 @container')}>
				<div className="flex flex-col items-center gap-3 text-center">
					<span className="flex size-9 items-center justify-center rounded-lg text-muted-foreground keycap-3d">
						<Bot className="size-5" aria-hidden="true" />
					</span>
					<WelcomeTitle surface={surface} />
				</div>
				{!isConfigured && <MissingKeyNotice onOpenConfig={onOpenConfig} />}
			</div>
		</div>
	);
}

type AssistantExamplesProps = {
	onPickExample: (prompt: string) => void;
	surface?: AssistantSurface;
};

export function AssistantExamples({ onPickExample, surface = 'page' }: Readonly<AssistantExamplesProps>) {
	const t = useTranslations();
	const labelId = useId();
	const LabelTag = EXAMPLES_LABEL_TAG[surface];
	return (
		<section aria-labelledby={labelId} className={cn('px-4', EXAMPLES_SPACING[surface])}>
			<div className={cn(ASSISTANT_COLUMN, 'flex flex-col items-center gap-3')}>
				<LabelTag id={labelId} className="text-[13px] text-muted-foreground">
					{t('chatView.EXAMPLES_LABEL')}
				</LabelTag>
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
