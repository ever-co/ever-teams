import { clsxm } from '@app/utils';
import Link from 'next/link';
import React from 'react';
import { SimpleArrowRight } from './svgs';
import Skeleton from 'react-loading-skeleton';

type Props = {
	paths: (string | { title: string; href: string })[];
	className?: string;
};

export function Breadcrumb({ paths, className }: Props) {
	return (
		<nav aria-label="breadcrumb" className={className}>
			<ol className="flex flex-row gap-2.5 items-center">
				{paths.map((path, i) => {
					return (
						<React.Fragment key={i}>
							{i !== 0 && (
								<li key={i + 'arrow-right'} className="font-normal">
									<SimpleArrowRight className="w-4 h-4 stroke-[#B1AEBC]" />
								</li>
							)}
							<li key={i} className="font-normal">
								{typeof path === 'string' && (
									<span
										className={clsxm(
											i < paths.length - 1 || i === 0
												? ['text-[#B1AEBC]']
												: ['text-default dark:text-white']
										)}
									>
										{path}
									</span>
								)}

								{typeof path === 'object' && (
									<Link
										href={path.href}
										className={clsxm(
											i < paths.length - 1 || i === 0
												? ['text-[#B1AEBC]']
												: ['text-default dark:text-white']
										)}
									>
										{path.title ? path.title : <Skeleton height={20} width={120} borderRadius={5} className="rounded-full dark:bg-[#353741]" />}
									</Link>
								)}
							</li>
						</React.Fragment>
					);
				})}
			</ol>
		</nav>
	);
}
