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
	// The initials shown while there is no picture say what the picture would: nothing for alt="" (the name is said
	// nearby), the alt for any other alt. Without an alt, they read as before.
	let fallbackText: { role?: 'img'; 'aria-label'?: string; 'aria-hidden'?: true } = {};
	if (alt === '') {
		fallbackText = { 'aria-hidden': true };
	} else if (alt) {
		fallbackText = { role: 'img', 'aria-label': alt };
	}
	return (
		<Tooltip message={title}>
			<ShadCnAvatar className={className}>
				<AvatarImage className={imageClassName} src={src} alt={alt ?? title} />
				<AvatarFallback className={fallbackClassName} {...fallbackText}>
					{fallback}
				</AvatarFallback>
			</ShadCnAvatar>
		</Tooltip>
	);
};

export { Avatar };
