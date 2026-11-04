import React from 'react';
interface isProps {
	status: 'Member' | 'Left' | 'Suspended';
}
export const MemberTableStatus = ({ status }: isProps) => {
	return <RenderStatus status={status} />;
};

/** The soft pair of the badge recipe: a tint and its ink, never a fill with white text. */
const CHIP = 'inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium';

const RenderStatus = ({ status }: isProps) => {
	switch (status) {
		case 'Member':
			return <div className={`${CHIP} bg-success/10 text-success-foreground`}>{status}</div>;
		case 'Left':
			return <div className={`${CHIP} bg-foreground/5 text-muted-foreground`}>{status}</div>;
		case 'Suspended':
			return <div className={`${CHIP} bg-destructive/10 text-destructive-ink`}>{status}</div>;
	}
};
