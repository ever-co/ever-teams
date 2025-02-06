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
					<div className="relative w-8 h-8">
						{avatar?.imageUrl ? (
							<Image
								src={avatar?.imageUrl}
								alt={avatar?.name}
								layout="fill"
								className="rounded-full border-2 border-white object-cover"
							/>
						) : (
							<div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-500 text-white font-medium border-2 border-white">
								{avatar?.name?.substring(0, 2).toUpperCase()}
							</div>
						)}
					</div>
					{/* Tooltip */}
					<div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
						{avatar?.name}
					</div>
				</div>
			))}
			{avatars.length > maxItemsToShow && (
				<div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-300 border-2 border-white text-xs font-medium">
					+{avatars.length - maxItemsToShow}
				</div>
			)}
		</div>
	);
};

export default AvatarStack;
