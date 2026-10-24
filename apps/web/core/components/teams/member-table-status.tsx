import React from 'react';
interface isProps {
	status: 'Member' | 'Left' | 'Suspended';
}
export const MemberTableStatus = ({ status }: isProps) => {
	return <RenderStatus status={status} />;
};

const CHIP = 'inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md px-2.5 text-xs font-medium';

const RenderStatus = ({ status }: isProps) => {
	switch (status) {
		case 'Member':
			return <div className={`${CHIP} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`}>{status}</div>;
		case 'Left':
			return <div className={`${CHIP} bg-muted text-muted-foreground`}>{status}</div>;
		case 'Suspended':
			return <div className={`${CHIP} bg-destructive/10 text-destructive`}>{status}</div>;
	}
};
