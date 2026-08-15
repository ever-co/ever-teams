import { Tooltip } from '../tooltip/teams-tooltip';
import { ShadCnAvatar, AvatarFallback, AvatarImage } from './avatar';
const Avatar = ({
	className,
	imageClassName,
	fallbackClassName,
	title,
	fallback,
	src
}: {
	title: string;
	className?: string;
	fallbackClassName?: string;
	imageClassName?: string;
	fallback: string;
	src: string;
}) => {
	return (
		<Tooltip message={title}>
			<ShadCnAvatar className={className}>
				<AvatarImage className={imageClassName} src={src} />
				<AvatarFallback className={fallbackClassName}>{fallback}</AvatarFallback>
			</ShadCnAvatar>
		</Tooltip>
	);
};

export { Avatar };
