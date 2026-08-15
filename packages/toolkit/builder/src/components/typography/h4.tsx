import React from 'react';

interface TypographyH1Props extends React.HTMLAttributes<HTMLHeadingElement> {
	children: React.ReactNode;
}

export function H4({ children, ...props }: TypographyH1Props): React.ReactElement {
	return (
		<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl" {...props}>
			{children}
		</h1>
	);
}
