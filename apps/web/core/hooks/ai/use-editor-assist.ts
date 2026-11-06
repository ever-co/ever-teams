'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { ChatConfig } from '@/core/components/features/chat-panel/components/chat-config-dialog';
import { requestEditorAssist, type TEditorAssistResult } from '@/core/services/client/api/ai/editor-assist.service';
import type { TEditorAssistRequest } from '@/core/types/schemas/ai/editor-assist.schema';
import { useAiConfig } from './use-ai-config';
import { useServerAiAvailability } from './use-server-ai-availability';

export type TEditorAssistInput = Omit<TEditorAssistRequest, 'config'>;

function toRequestConfig(config: ChatConfig | null): TEditorAssistRequest['config'] {
	if (!config?.apiKey) {
		return undefined;
	}
	return {
		apiKey: config.apiKey,
		provider: config.provider,
		model: config.model,
		baseURL: config.baseURL
	};
}

/**
 * Writing help for the rich editors. The deployment's own AI key comes first; without one, the user's assistant
 * configuration is sent with the request. A new request cancels the one still running, and leaving cancels it too.
 */
export function useEditorAssist() {
	const { config, isConfigured: hasUserConfig, saveConfig } = useAiConfig();
	const { hasServerAi: hasServerKey, isChecking: isCheckingAvailability } = useServerAiAvailability();
	const isConfigured = hasServerKey || hasUserConfig;
	const controllerRef = useRef<AbortController | null>(null);

	const cancel = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
	}, []);

	const run = useCallback(
		async (input: TEditorAssistInput): Promise<TEditorAssistResult> => {
			const userConfig = toRequestConfig(config);
			const sendsUserConfig = !hasServerKey && Boolean(userConfig);
			const canRun = hasServerKey || sendsUserConfig;
			if (!canRun) {
				return { ok: false, reason: 'not_configured' };
			}
			cancel();
			const controller = new AbortController();
			controllerRef.current = controller;
			const request: TEditorAssistRequest = { ...input };
			if (sendsUserConfig) {
				request.config = userConfig;
			}
			const result = await requestEditorAssist(request, controller.signal);
			if (controller.signal.aborted) {
				return { ok: false, reason: 'aborted' };
			}
			controllerRef.current = null;
			return result;
		},
		[cancel, config, hasServerKey]
	);

	useEffect(() => cancel, [cancel]);

	return { config, isConfigured, isCheckingAvailability, saveConfig, run, cancel };
}
