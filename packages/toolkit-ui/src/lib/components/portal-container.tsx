'use client';

import * as React from 'react';

/**
 * The element where this package's dialogs, popovers, menus and selects mount their content. Without one they mount
 * in document.body, as Radix does by default. `<TeamsProvider scopedStyles>` of @ever-teams/atoms provides a container
 * inside its kit root, so the kit's stylesheet reaches them.
 */
export const PortalContainerContext = React.createContext<HTMLElement | null>(null);

export const usePortalContainer = (): HTMLElement | undefined => React.useContext(PortalContainerContext) ?? undefined;

// The type Radix Portals give their container, so a wrapped Portal keeps all its own props.
type PortalProps = { container?: Element | DocumentFragment | null };

// A Radix Portal that mounts in the provided container; a `container` prop given by the caller still wins.
export function withKitContainer<P extends PortalProps>(Portal: React.ComponentType<P>) {
	function KitPortal(props: P) {
		const container = usePortalContainer();
		return <Portal container={container} {...props} />;
	}
	KitPortal.displayName = `KitPortal(${Portal.displayName ?? Portal.name ?? 'Portal'})`;
	return KitPortal;
}
