'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PortalContainerContext } from '@ever-teams/toolkit-ui';

// The attribute every rule of @ever-teams/atoms/styles.css is scoped under.
export const KIT_ROOT_ATTRIBUTE = 'data-ever-teams-kit';

/**
 * The kit root of <TeamsProvider scopedStyles>: an element that takes no box of its own (display: contents) around the
 * kit's components, and a container in document.body for their dialogs, popovers, menus and selects. Both carry the
 * attribute the stylesheet is scoped under, so the stylesheet reaches the kit and nothing else.
 */
export function KitRoot({ children }: { children?: ReactNode }) {
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const element = document.createElement('div');
		element.setAttribute(KIT_ROOT_ATTRIBUTE, '');
		element.setAttribute('data-ever-teams-portal', '');
		document.body.appendChild(element);
		setPortalContainer(element);
		return () => {
			element.remove();
		};
	}, []);

	return (
		<div {...{ [KIT_ROOT_ATTRIBUTE]: '' }} style={{ display: 'contents' }}>
			<PortalContainerContext.Provider value={portalContainer}>{children}</PortalContainerContext.Provider>
		</div>
	);
}
