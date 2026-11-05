'use client';

import type { RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowUp, Bot, Key, Stop } from '@/core/components/icons';
import { APP_NAME } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { DictationButton } from '@/core/components/common/dictation-button';
import { appendDictatedText } from '@/core/hooks/ai/use-dictation';
import { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea } from '../prompt-kit/prompt-input';

type AssistantComposerProps = {
	value: string;
	onValueChange: (value: string) => void;
	onSubmit: () => void;
	onStop: () => void;
	onOpenConfig: () => void;
	isBusy: boolean;
	isConfigured: boolean;
	hasUserConfig: boolean;
	model: string | null;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	className?: string;
};

const roundActionRecipe = 'rounded-full';

function modelLabelOf(hasUserConfig: boolean, model: string | null, defaultLabel: string) {
	if (hasUserConfig && model) {
		return model;
	}
	return defaultLabel;
}

function ModelButton({
	isConfigured,
	hasUserConfig,
	model,
	onOpenConfig
}: Readonly<Pick<AssistantComposerProps, 'isConfigured' | 'hasUserConfig' | 'model' | 'onOpenConfig'>>) {
	const t = useTranslations();
	const modelLabel = modelLabelOf(hasUserConfig, model, t('chatView.DEFAULT_MODEL'));

	if (!isConfigured) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="rounded-full text-xs text-primary-ink"
				onClick={onOpenConfig}
			>
				<Key className="size-3.5" />
				{t('chatView.ADD_API_KEY')}
			</Button>
		);
	}

	return (
		<PromptInputAction tooltip={t('chatView.CHANGE_MODEL')}>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="max-w-56 rounded-full text-xs font-normal text-muted-foreground"
				onClick={onOpenConfig}
				aria-label={t('chatView.CHANGE_MODEL')}
			>
				<Bot className="size-3.5" />
				<span className="truncate">{modelLabel}</span>
			</Button>
		</PromptInputAction>
	);
}

function SubmitButton({
	isBusy,
	canSend,
	onSubmit,
	onStop
}: Readonly<{
	isBusy: boolean;
	canSend: boolean;
	onSubmit: () => void;
	onStop: () => void;
}>) {
	const t = useTranslations();

	if (isBusy) {
		return (
			<PromptInputAction tooltip={t('chatView.STOP')}>
				<Button
					type="button"
					size="icon"
					className={roundActionRecipe}
					onClick={onStop}
					aria-label={t('chatView.STOP')}
				>
					<Stop className="size-3.5" />
				</Button>
			</PromptInputAction>
		);
	}

	return (
		<PromptInputAction tooltip={t('chatView.SEND')}>
			<Button
				type="button"
				size="icon"
				className={roundActionRecipe}
				onClick={onSubmit}
				disabled={!canSend}
				aria-label={t('chatView.SEND')}
			>
				<ArrowUp className="size-4" />
			</Button>
		</PromptInputAction>
	);
}

export function AssistantComposer({
	value,
	onValueChange,
	onSubmit,
	onStop,
	onOpenConfig,
	isBusy,
	isConfigured,
	hasUserConfig,
	model,
	textareaRef,
	className
}: Readonly<AssistantComposerProps>) {
	const t = useTranslations();
	const trimmedValue = value.trim();
	const hasText = trimmedValue.length > 0;
	const canSend = hasText && isConfigured;

	const readyPlaceholder = t('chatView.ASK_PLACEHOLDER', { appName: APP_NAME });
	const lockedPlaceholder = t('chatView.INPUT_PLACEHOLDER_NO_KEY');
	const placeholder = pickPlaceholder(isConfigured, readyPlaceholder, lockedPlaceholder);

	const appendToDraft = (text: string) => {
		const nextValue = appendDictatedText(value, text);
		onValueChange(nextValue);
		textareaRef.current?.focus();
	};

	const handleSubmit = () => {
		if (!canSend) {
			return;
		}
		if (isBusy) {
			return;
		}
		onSubmit();
	};

	return (
		<PromptInput
			value={value}
			onValueChange={onValueChange}
			onSubmit={handleSubmit}
			isLoading={isBusy}
			disabled={!isConfigured}
			textareaRef={textareaRef}
			className={cn('w-full', className)}
		>
			<PromptInputTextarea placeholder={placeholder} aria-label={t('chatView.COMPOSER_LABEL')} />
			<PromptInputActions className="justify-between gap-2 pt-1 pl-0.5">
				<ModelButton
					isConfigured={isConfigured}
					hasUserConfig={hasUserConfig}
					model={model}
					onOpenConfig={onOpenConfig}
				/>
				<div className="flex items-center gap-1.5">
					<DictationButton onText={appendToDraft} disabled={!isConfigured} />
					<SubmitButton isBusy={isBusy} canSend={canSend} onSubmit={handleSubmit} onStop={onStop} />
				</div>
			</PromptInputActions>
		</PromptInput>
	);
}

function pickPlaceholder(isConfigured: boolean, readyPlaceholder: string, lockedPlaceholder: string) {
	if (isConfigured) {
		return readyPlaceholder;
	}
	return lockedPlaceholder;
}
