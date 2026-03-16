'use client';

import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/core/components/common/dialog';
import { Input } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';

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

export function ChatConfigDialog({ open, onOpenChange, config, onSave }: ChatConfigDialogProps) {
	const [apiKey, setApiKey] = useState(config?.apiKey ?? '');
	const [provider, setProvider] = useState<ChatConfig['provider']>(config?.provider ?? 'openai');
	const [model, setModel] = useState(config?.model ?? 'gpt-4o-mini');
	const [baseURL, setBaseURL] = useState(config?.baseURL ?? '');

	const handleProviderChange = (newProvider: ChatConfig['provider']) => {
		setProvider(newProvider);
		const providerInfo = PROVIDERS.find((p) => p.value === newProvider);
		if (providerInfo?.defaultModel) {
			setModel(providerInfo.defaultModel);
		}
	};

	const handleSave = () => {
		if (!apiKey.trim()) return;
		onSave({
			apiKey: apiKey.trim(),
			provider,
			model: model.trim() || PROVIDERS_INDEX.get(provider)?.defaultModel || 'gpt-4o-mini',
			...(provider === 'custom' && baseURL.trim() ? { baseURL: baseURL.trim() } : {})
		});
	};

	useEffect(() => {
		if (open) {
			setApiKey(config?.apiKey ?? '');
			setProvider(config?.provider ?? 'openai');
			setModel(config?.model ?? PROVIDERS_INDEX.get(config?.provider ?? 'openai')?.defaultModel ?? 'gpt-4o-mini');
			setBaseURL(config?.baseURL ?? '');
		}
	}, [open, config]);

	const canSave = apiKey.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md z-1100">
				<DialogHeader>
					<DialogTitle>AI Chat Configuration</DialogTitle>
					<DialogDescription>Configure your AI provider and your API Key to use AI.</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-2">
					{/* Provider Selection */}
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium text-foreground">Provider</label>
						<div className="grid grid-cols-2 gap-2">
							{PROVIDERS.map((p) => (
								<button
									key={p.value}
									type="button"
									onClick={() => handleProviderChange(p.value)}
									className={cn(
										'rounded-md border px-3 py-2 text-xs font-medium transition-colors',
										provider === p.value
											? 'border-primary bg-primary/10 text-primary dark:border-primary-light dark:bg-primary-light/10 dark:text-primary-light'
											: 'border-border bg-background text-muted-foreground hover:bg-muted'
									)}
								>
									{p.label}
								</button>
							))}
						</div>
					</div>

					{/* API Key */}
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor="ai-config-api-key">
							API Key
						</label>
						<Input
							id="ai-config-api-key"
							type="password"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							placeholder="sk-..."
							autoComplete="off"
						/>
						<p className="text-xs text-muted-foreground">Your key is stored locally...</p>
					</div>

					{/* Model */}
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium text-foreground" htmlFor="ai-config-model">
							Model
						</label>
						<Input
							id="ai-config-model"
							type="text"
							value={model}
							onChange={(e) => setModel(e.target.value)}
							placeholder="gpt-4o-mini"
						/>
					</div>

					{/* Custom Base URL */}
					{provider === 'custom' && (
						<div className="flex flex-col gap-1.5">
							<label className="text-sm font-medium text-foreground" htmlFor="ai-config-base-url">
								Base URL
							</label>
							<Input
								type="url"
								value={baseURL}
								onChange={(e) => setBaseURL(e.target.value)}
								placeholder="https://api.example.com/v1"
							/>
						</div>
					)}
				</div>

				<DialogFooter>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={!canSave}
						className={cn(
							'rounded-md px-4 py-2 text-sm font-medium transition-colors',
							'bg-primary text-primary-foreground hover:bg-primary/90',
							'dark:bg-primary-light dark:hover:bg-primary-light/90',
							'disabled:cursor-not-allowed disabled:opacity-50'
						)}
					>
						Save
					</button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
