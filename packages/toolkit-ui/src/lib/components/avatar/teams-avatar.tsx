import { Tooltip } from '../tooltip/teams-tooltip';
import { ShadCnAvatar, AvatarFallback, AvatarImage } from './avatar';
const Avatar = ({
	className,
	imageClassName,
	fallbackClassName,
	title,
	fallback,
	src,
	alt
}: {
	title: string;
	// What the picture shows, for screen readers: the title by default, "" when the name is already said nearby.
	alt?: string;
	className?: string;
	fallbackClassName?: string;
	imageClassName?: string;
	fallback: string;
	src: string;
}) => {
	return (
		<Tooltip message={title}>
			<ShadCnAvatar className={className}>
				<AvatarImage className={imageClassName} src={src} alt={alt ?? title} />
				<AvatarFallback className={fallbackClassName}>{fallback}</AvatarFallback>
			</ShadCnAvatar>
		</Tooltip>
	);
};

export { Avatar };
