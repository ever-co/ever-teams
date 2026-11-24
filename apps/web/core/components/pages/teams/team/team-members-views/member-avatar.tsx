import { Avatar } from '@/core/components/duplicated-components/avatar';
import { isValidUrl } from '@/core/lib/utils';

// The first letter of the name in its own script ("李雷" gives 李): the shared title helper keeps Latin letters only
function initialOf(fullname: string): string {
	const letter = /\p{L}/u.exec(fullname);
	if (!letter) {
		return '';
	}
	return letter[0].toUpperCase();
}

/** A member's avatar on the team page: their image, or their initial without one and when the image fails to load. */
export function MemberAvatar({ fullname, imageUrl }: Readonly<{ fullname: string; imageUrl: string }>) {
	const initial = <div className="flex size-9 items-center justify-center rounded-full">{initialOf(fullname)}</div>;
	const hasImage = Boolean(imageUrl) && isValidUrl(imageUrl);
	if (!hasImage) {
		return initial;
	}
	return (
		<Avatar
			size={36}
			className="relative cursor-pointer"
			imageUrl={imageUrl}
			alt="Team Avatar"
			fallback={initial}
		/>
	);
}
