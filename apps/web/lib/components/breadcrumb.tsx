import { clsxm } from '@app/utils';
import Link from 'next/link';

type Props = {
	paths: (string | { title: string; href: string })[];
	className?: string;
};

export function Breadcrumb({ paths, className }: Props) {
	return (
		<nav aria-label="breadcrumb" className={className}>
			<ol className="flex">
				{paths.map((path, i) => {
					return (
						<li key={i} className="font-normal">
							{i !== 0 && <span className="text-gray-500 px-3">{' > '}</span>}
							{typeof path === 'string' && (
								<span
									className={clsxm(
										i < paths.length - 1 || i === 0
											? ['text-gray-500']
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
											? ['text-gray-500 mr-4']
											: ['text-default dark:text-white']
									)}
								>
									{path.title}
								</Link>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
