/**
 * Stand-ins for the bottom sheet in tests: the library's own mock with a sheet that keeps the props it was given, and
 * a gesture root that is a plain view.
 */
import type { ReactNode } from 'react';

/** The props of every sheet drawn, the latest last. */
export const sheetPropsSeen: Array<Record<string, unknown>> = [];

export function bottomSheetStandIn() {
	return {
		__esModule: true,
		...jest.requireActual<object>('@gorhom/bottom-sheet/mock'),
		default: ({ children, ...props }: { children: ReactNode }) => {
			sheetPropsSeen.push(props);
			return children;
		}
	};
}

export function gestureHandlerStandIn() {
	const { View } = jest.requireActual('react-native');
	return { GestureHandlerRootView: View };
}
