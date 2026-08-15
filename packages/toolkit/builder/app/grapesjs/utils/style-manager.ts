import { GrapesJSEditor, CSSRule } from '../types';
import { GrapesJSError } from './error-handler';
import { GrapesJSErrorType } from '../constants/error-types';

const convertComputedStyleToRecord = (style: CSSStyleDeclaration): Record<string, string> => {
	const record: Record<string, string> = {};
	Array.from(style).forEach((property) => {
		record[property] = style.getPropertyValue(property);
	});
	return record;
};

export const addGlobalStyles = (editor: GrapesJSEditor, styles: string | CSSRule[]): void => {
	try {
		const styleManager = editor.Css;
		if (!styleManager) {
			throw new GrapesJSError(GrapesJSErrorType.STYLE_ERROR, 'global', 'Style manager not initialized');
		}

		if (typeof styles === 'string') {
			styleManager.addRules(styles);
		} else {
			styleManager.addRules(styles);
		}
	} catch (error) {
		throw new GrapesJSError(GrapesJSErrorType.STYLE_ERROR, 'global', `Failed to add global styles: ${error}`);
	}
};

export const removeStylesBySelector = (editor: GrapesJSEditor, selector: string): void => {
	try {
		const styleManager = editor.Css;
		if (!styleManager) {
			throw new GrapesJSError(GrapesJSErrorType.STYLE_ERROR, selector, 'Style manager not initialized');
		}

		const rules = styleManager.getAll();
		rules?.forEach((rule: CSSRule) => {
			if (rule?.selectorsToString().includes(selector)) {
				styleManager.remove(rule);
			}
		});
	} catch (error) {
		throw new GrapesJSError(GrapesJSErrorType.STYLE_ERROR, selector, `Failed to remove styles: ${error}`);
	}
};

export const getComputedStyles = (editor: GrapesJSEditor, componentId: string): Record<string, string> => {
	try {
		const canvas = editor.Canvas;
		if (!canvas) {
			throw new GrapesJSError(GrapesJSErrorType.STYLE_ERROR, componentId, 'Canvas not initialized');
		}

		const component = editor.getComponents().find((comp) => comp.get('id') === componentId);
		if (!component) {
			throw new GrapesJSError(GrapesJSErrorType.STYLE_ERROR, componentId, 'Component not found');
		}

		const el = canvas.getDocument().querySelector(`[data-gjs-id="${componentId}"]`);
		if (!el) {
			throw new GrapesJSError(GrapesJSErrorType.STYLE_ERROR, componentId, 'Element not found in canvas');
		}

		const computedStyle = window.getComputedStyle(el);
		return convertComputedStyleToRecord(computedStyle);
	} catch (error) {
		if (error instanceof GrapesJSError) {
			throw error;
		}
		throw new GrapesJSError(GrapesJSErrorType.STYLE_ERROR, componentId, `Failed to get computed styles: ${error}`);
	}
};
