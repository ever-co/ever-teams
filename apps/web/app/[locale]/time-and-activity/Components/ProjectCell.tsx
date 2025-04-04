import { Avatar } from '@/lib/components';
import Image from 'next/image';

interface ProjectCellProps {
	imageUrl: string;
	name: string;
}

export function ProjectCell({ imageUrl, name }: ProjectCellProps) {
	return (
		<div className="flex items-center gap-3">
			<Avatar className="w-8 h-8  border shrink-0 " size={32}>
				<Image
					src={imageUrl}
					alt={name}
					width={32}
					height={32}
					className="w-full h-full object-cover rounded-lg"
					loading="lazy"
				/>
			</Avatar>
			<span className="text-gray-900 dark:text-gray-100 font-medium">{name}</span>
		</div>
	);
}
