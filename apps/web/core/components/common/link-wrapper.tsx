import Link from 'next/link';
import React from 'react';

const LinkWrapper = ({
	isRoute,
	children,
	href
}: {
	isRoute: boolean;
	children: React.ReactNode;
	href: string | undefined;
}) => {
	return <>{isRoute && href ? <Link href={href}>{children}</Link> : <>{children}</>}</>;
};

export default LinkWrapper;
