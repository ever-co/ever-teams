import type { LanguageModel } from 'ai';
import { freeLanguageLinks, hasServerLanguageModel, paidLanguageLinks } from '@/core/lib/ai/server-providers';

export type ServerAiModel = {
	id: string;
	model: LanguageModel;
};

/** The deployment's own models in the order they are tried: the free chain, then the paid path. */
export function serverAiModels(): ServerAiModel[] {
	const links = [...freeLanguageLinks(), ...paidLanguageLinks()];
	return links.map((link) => ({ id: link.id, model: link.model }));
}

export function hasServerAiProvider() {
	return hasServerLanguageModel();
}
