import React from 'react';
import { TeamsBasicTimer } from '@ever-teams/atoms';

export function TeamsSmallTimer({
	border,
	background,
	color,
	rounded,
	className,
	...props
}: {
	border: 'none' | 'thick' | 'thin';
	background: 'destructive' | 'none' | 'primary' | 'secondary';
	color: 'destructive' | 'primary' | 'secondary';
	rounded: 'none' | 'small' | 'medium' | 'large';
	textAlign: string;
	className: string;
}) {
	return (
		<div>
			<TeamsBasicTimer {...props} className={className} background={background} border={border} color={color} />
		</div>
	);
}
