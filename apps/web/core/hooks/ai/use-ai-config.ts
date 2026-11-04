'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { ChatConfig } from '@/core/components/features/chat-panel/components/chat-config-dialog';

const CHAT_CONFIG_KEY = 'ever-teams-chat-config';

const configListeners = new Set<() => void>();

let configSnapshot: ChatConfig | null | undefined;

function readRawConfig() {
	try {
		return localStorage.getItem(CHAT_CONFIG_KEY);
	} catch {
		return null;
	}
}

function parseConfig(raw: string | null): ChatConfig | null {
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw) as ChatConfig;
	} catch {
		return null;
	}
}

function loadConfigFromStorage() {
	const raw = readRawConfig();
	configSnapshot = parseConfig(raw);
}

function readConfigSnapshot() {
	if (configSnapshot === undefined) {
		loadConfigFromStorage();
	}
	return configSnapshot ?? null;
}

function readServerConfigSnapshot(): ChatConfig | null {
	return null;
}

function notifyConfigListeners() {
	configListeners.forEach((listener) => listener());
}

function handleStorageEvent(event: StorageEvent) {
	if (event.key !== CHAT_CONFIG_KEY) {
		return;
	}
	loadConfigFromStorage();
	notifyConfigListeners();
}

function subscribeToConfig(listener: () => void) {
	configListeners.add(listener);
	const isFirstListener = configListeners.size === 1;
	if (isFirstListener) {
		window.addEventListener('storage', handleStorageEvent);
	}
	return () => {
		configListeners.delete(listener);
		const hasNoListener = configListeners.size === 0;
		if (hasNoListener) {
			window.removeEventListener('storage', handleStorageEvent);
		}
	};
}

function storeConfig(config: ChatConfig) {
	configSnapshot = config;
	notifyConfigListeners();
	try {
		const serialized = JSON.stringify(config);
		localStorage.setItem(CHAT_CONFIG_KEY, serialized);
	} catch {
		// Browser storage can be unavailable or full: the configuration then lasts for this page session.
	}
}

/**
 * The user's own AI configuration (provider, key, model), kept in this browser and shared by every AI surface:
 * the assistant and the editors' writing help read and save the same one.
 */
export function useAiConfig() {
	const config = useSyncExternalStore(subscribeToConfig, readConfigSnapshot, readServerConfigSnapshot);
	const saveConfig = useCallback((nextConfig: ChatConfig) => {
		storeConfig(nextConfig);
	}, []);
	const isConfigured = Boolean(config?.apiKey);
	return { config, isConfigured, saveConfig };
}
