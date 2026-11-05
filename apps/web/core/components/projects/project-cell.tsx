import Image from 'next/image';
import { Avatar } from '../duplicated-components/avatar';

interface ProjectCellProps {
	imageUrl: string;
	name: string;
}

export function ProjectCell({ imageUrl, name }: ProjectCellProps) {
	return (
		<div className="flex items-center gap-3">
			<Avatar className="shrink-0" size={32}>
				{imageUrl ? (
					<Image
						src={imageUrl}
						alt={name}
						width={32}
						height={32}
						className="object-cover w-full h-full rounded-full"
						loading="lazy"
					/>
				) : null}
			</Avatar>
			<span className="font-medium text-foreground">{name}</span>
		</div>
	);
}
