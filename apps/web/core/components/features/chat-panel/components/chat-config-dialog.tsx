'use client';

import { useId, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/core/components/common/dialog';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';

export interface ChatConfig {
	apiKey: string;
	provider: 'openai' | 'groq' | 'together' | 'custom';
	model: string;
	baseURL?: string;
}

interface ChatConfigDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	config: ChatConfig | null;
	onSave: (config: ChatConfig) => void;
}

const PROVIDERS = [
	{ value: 'openai' as const, label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
	{ value: 'groq' as const, label: 'Groq', defaultModel: 'llama-3.3-70b-versatile' },
	{ value: 'together' as const, label: 'Together AI', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
	{ value: 'custom' as const, label: 'Custom (OpenAI-compatible)', defaultModel: '' }
];
const PROVIDERS_INDEX = new Map(PROVIDERS.map((provider) => [provider.value, provider]));

const DEFAULT_PROVIDER: ChatConfig['provider'] = 'openai';

function defaultModelOf(provider: ChatConfig['provider']) {
	return PROVIDERS_INDEX.get(provider)?.defaultModel || 'gpt-4o-mini';
}

function initialModelOf(config: ChatConfig | null) {
	if (config?.model) {
		return config.model;
	}
	return defaultModelOf(config?.provider ?? DEFAULT_PROVIDER);
}

interface ChatConfigFormProps {
	config: ChatConfig | null;
	onSave: (config: ChatConfig) => void;
	onCancel: () => void;
}

/**
 * The AI configuration fields with their Cancel and Save actions. The assistant shows them in a dialog; the editors'
 * writing help shows them in place, inside its own panel.
 */
export function ChatConfigForm({ config, onSave, onCancel }: Readonly<ChatConfigFormProps>) {
	const [syncedConfig, setSyncedConfig] = useState(config);
	const [apiKey, setApiKey] = useState(config?.apiKey ?? '');
	const [provider, setProvider] = useState<ChatConfig['provider']>(config?.provider ?? DEFAULT_PROVIDER);
	const [model, setModel] = useState(() => initialModelOf(config));
	const [baseURL, setBaseURL] = useState(config?.baseURL ?? '');
	const fieldId = useId();
	const t = useTranslations();

	if (syncedConfig !== config) {
		setSyncedConfig(config);
		setApiKey(config?.apiKey ?? '');
		setProvider(config?.provider ?? DEFAULT_PROVIDER);
		setModel(initialModelOf(config));
		setBaseURL(config?.baseURL ?? '');
	}

	const handleProviderChange = (newProvider: ChatConfig['provider']) => {
		setProvider(newProvider);
		const providerInfo = PROVIDERS.find((p) => p.value === newProvider);
		if (providerInfo?.defaultModel) {
			setModel(providerInfo.defaultModel);
		}
	};

	const trimmedApiKey = apiKey.trim();
	const trimmedBaseURL = baseURL.trim();
	const canSave = trimmedApiKey.length > 0;
	const isCustomProvider = provider === 'custom';

	const handleSave = () => {
		if (!canSave) return;
		const nextConfig: ChatConfig = {
			apiKey: trimmedApiKey,
			provider,
			model: model.trim() || defaultModelOf(provider)
		};
		const keepsBaseURL = isCustomProvider && Boolean(trimmedBaseURL);
		if (keepsBaseURL) {
			nextConfig.baseURL = trimmedBaseURL;
		}
		onSave(nextConfig);
	};

	const providerLabelId = `${fieldId}-provider`;
	const apiKeyId = `${fieldId}-api-key`;
	const modelId = `${fieldId}-model`;
	const baseUrlId = `${fieldId}-base-url`;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-4 py-2">
				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium text-foreground" id={providerLabelId}>
						{t('chatConfig.PROVIDER_LABEL')}
					</label>
					<div role="radiogroup" aria-labelledby={providerLabelId} className="grid grid-cols-2 gap-2">
						{PROVIDERS.map((p) => {
							const isSelected = provider === p.value;
							return (
								<button
									key={p.value}
									type="button"
									onClick={() => handleProviderChange(p.value)}
									className={cn(
										'rounded-md hairline-border border-transparent px-3 py-2 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25',
										isSelected && 'bg-primary/10 text-primary-ink hairline-ring ring-primary/30',
										!isSelected &&
											'bg-card text-muted-foreground shadow-sm shadow-black/10 hairline-ring ring-foreground/10 hover:bg-muted/50 hover:text-foreground dark:ring-foreground/15'
									)}
									role="radio"
									aria-checked={isSelected}
								>
									{p.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium text-foreground" htmlFor={apiKeyId}>
						{t('chatConfig.API_KEY_LABEL')}
					</label>
					<Input
						id={apiKeyId}
						type="password"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						placeholder={t('chatConfig.API_KEY_PLACEHOLDER')}
						autoComplete="off"
					/>
					<p className="text-xs text-muted-foreground">{t('chatConfig.API_KEY_HINT')}</p>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className="text-sm font-medium text-foreground" htmlFor={modelId}>
						{t('chatConfig.MODEL_LABEL')}
					</label>
					<Input
						id={modelId}
						type="text"
						value={model}
						onChange={(e) => setModel(e.target.value)}
						placeholder={t('chatConfig.MODEL_PLACEHOLDER')}
					/>
				</div>

				{isCustomProvider && (
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor={baseUrlId}>
							{t('chatConfig.BASE_URL_LABEL')}
						</label>
						<Input
							id={baseUrlId}
							type="url"
							value={baseURL}
							onChange={(e) => setBaseURL(e.target.value)}
							placeholder={t('chatConfig.BASE_URL_PLACEHOLDER')}
						/>
					</div>
				)}
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" size="lg" onClick={onCancel}>
					{t('chatConfig.CANCEL')}
				</Button>
				<Button type="button" size="lg" onClick={handleSave} disabled={!canSave}>
					{t('chatConfig.SAVE')}
				</Button>
			</DialogFooter>
		</div>
	);
}

export function ChatConfigDialog({ open, onOpenChange, config, onSave }: ChatConfigDialogProps) {
	const t = useTranslations();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md z-[1100]">
				<DialogHeader>
					<DialogTitle>{t('chatConfig.DIALOG_TITLE')}</DialogTitle>
					<DialogDescription>{t('chatConfig.DIALOG_DESCRIPTION')}</DialogDescription>
				</DialogHeader>
				<ChatConfigForm
					key={String(open)}
					config={config}
					onSave={onSave}
					onCancel={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
