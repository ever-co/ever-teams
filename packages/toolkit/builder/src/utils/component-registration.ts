import { GrapesJSEditor, ComponentConfig } from '../../types/Grapesjs';
import { GrapesJSError, GrapesJSErrorType, handleGrapesJSError } from './error-handling';

export const registerComponent = (
	editor: GrapesJSEditor | null,
	componentId: string,
	config: ComponentConfig
): boolean => {
	try {
		if (!editor?.DomComponents) {
			throw new GrapesJSError(
				GrapesJSErrorType.INITIALIZATION,
				componentId,
				'Editor or DomComponents not initialized'
			);
		}

		if (editor.DomComponents.getType(componentId)) {
			throw new GrapesJSError(
				GrapesJSErrorType.COMPONENT_REGISTRATION,
				componentId,
				'Component already registered'
			);
		}

		editor.DomComponents.addType(componentId, config);
		return true;
	} catch (error) {
		if (error instanceof GrapesJSError) {
			handleGrapesJSError(error);
		} else {
			handleGrapesJSError(
				new GrapesJSError(
					GrapesJSErrorType.COMPONENT_REGISTRATION,
					componentId,
					error instanceof Error ? error.message : 'Unknown error during component registration'
				)
			);
		}
		return false;
	}
};
