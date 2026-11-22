import { Avatar } from '@/core/components/duplicated-components/avatar';
import { imgTitle } from '@/core/lib/helpers/index';
import { isValidUrl } from '@/core/lib/utils';

/** A member's avatar on the team page: their image, or their initial without one and when the image fails to load. */
export function MemberAvatar({ fullname, imageUrl }: Readonly<{ fullname: string; imageUrl: string }>) {
	const initial = (
		<div className="flex size-9 items-center justify-center rounded-full">{imgTitle(fullname).charAt(0)}</div>
	);
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
