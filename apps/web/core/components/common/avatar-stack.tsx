import Image from 'next/image';
import { useMemo } from 'react';

interface AvatarStackProps {
	avatars: { imageUrl?: string; name: string }[];
	maxVisible?: number;
}

/**
 * Displays a stack of overlapping avatars with tooltips.
 *
 * @component
 * @param {AvatarStackProps} props - The component props.
 * @param {{imageUrl ?: string, name : string}[]} props.avatars - List of avatars with image URLs and full names.
 * @param {number} [props.maxVisible=4] - Maximum visible avatars before showing "+X" count.
 * @returns {JSX.Element} The AvatarStack component.
 */
const AvatarStack: React.FC<AvatarStackProps> = ({ avatars, maxVisible = 5 }) => {
	const maxItemsToShow = useMemo(
		() => (avatars.length > maxVisible ? maxVisible : avatars.length),
		[avatars.length, maxVisible]
	);

	return (
		<div className="flex -space-x-3">
			{avatars.slice(0, maxItemsToShow).map((avatar, index) => (
				<div key={index} className="relative group">
					<div className="relative w-8 h-8 rounded-full shrink-0 aspect-square">
						{avatar?.imageUrl ? (
							<Image
								src={avatar?.imageUrl}
								alt={avatar?.name}
								width={32}
								height={32}
								className="object-cover border-2 border-white rounded-full size-full aspect-square"
							/>
						) : (
							<div
								className="flex items-center justify-center w-8 h-8 font-medium text-white bg-gray-500 border-2 border-white rounded-full"
								role="img"
								aria-label={`Avatar for ${avatar?.name}`}
							>
								{avatar?.name?.substring(0, 2).toUpperCase()}
							</div>
						)}
					</div>
					{/* Tooltip */}
					<div className="absolute px-2 py-1 text-xs text-white transition transform -translate-x-1/2 bg-gray-800 rounded-sm shadow-lg opacity-0 bottom-12 left-1/2 group-hover:opacity-100 whitespace-nowrap">
						{avatar?.name}
					</div>
				</div>
			))}
			{avatars.length > maxItemsToShow && (
				<div className="flex items-center justify-center w-8 h-8 text-xs font-medium bg-gray-300 border-2 border-white rounded-full">
					+{avatars.length - maxItemsToShow}
				</div>
			)}
		</div>
	);
};

export default AvatarStack;
