import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import Image from 'next/image';
import Link from 'next/link';
import Skeleton from 'react-loading-skeleton';
import { Tooltip } from './tooltip';
export interface ImageOverlapperProps {
	id: string;
	url: string;
	alt: string;
}

export default function ImageOverlapper({
	images,
	radius = 20,
	displayImageCount = 4
}: {
	images: ImageOverlapperProps[];
	radius?: number;
	displayImageCount?: number;
}) {
	// Split the array into two arrays based on the display number
	const firstArray = images.slice(0, displayImageCount);
	const widthCalculate = images.slice(0, 5);
	const secondArray = images.slice(displayImageCount);
	const isMoreThanDisplay = images.length > displayImageCount;
	const imageLength = images.length;

	if (imageLength == undefined) {
		return <Skeleton height={40} width={40} borderRadius={100} className="rounded-full dark:bg-[#353741]" />;
	}
	return (
		<div
			style={{
				width:
					imageLength == 1 ? 40 : isMoreThanDisplay ? widthCalculate.length * 33 : widthCalculate.length * 35
			}}
			className="relative "
		>
			{firstArray.map((image, index) => (
				<Link key={index} href={`/profile/${image.id}?name=${image.alt}`}>
					<div
						className="absolute hover:!z-20 transition-all hover:scale-110"
						style={{ zIndex: index + 1, left: index * 30, top: isMoreThanDisplay ? -8 : -16 }}
					>
						<Tooltip
							label={image.alt ?? 'untitled'}
							labelClassName={image.alt ? '' : 'text-gray-500'}
							placement="top"
						>
							<Image
								src={image.url}
								alt={`${image.alt} avatar`}
								width={80}
								height={80}
								style={{ borderRadius: radius }}
								className="!h-10 !w-10 border-2 border-white"
							/>
						</Tooltip>
					</div>
				</Link>
			))}
			{secondArray.length > 0 && (
				<Popover>
					<PopoverTrigger>
						<div
							style={{
								top: isMoreThanDisplay ? -8 : -16,
								borderRadius: radius
							}}
							className="flex absolute left-28 z-[6] flex-row text-sm text-[#282048] dark:text-white font-semibold items-center justify-center !h-10 !w-10 border-2 border-[#0000001a] dark:border-white bg-white dark:bg-[#191A20]"
						>
							{secondArray.length < 100 ? secondArray.length : 99}+
						</div>
					</PopoverTrigger>
					<PopoverContent className="!p-0 bg-white dark:bg-dark--theme max-h-40 overflow-y-auto ">
						<div className="flex flex-col space-y-2 m-2">
							{secondArray.map((image: ImageOverlapperProps, index: number) => {
								return (
									<Link
										href={`/profile/${image.id}?name=${image.alt}`}
										className="relative hover:bg-gray-300 hover:dark:bg-[#24262c] p-1 rounded-md"
										key={index}
									>
										<div className="flex items-center">
											<Image
												src={image.url}
												alt={`${image.alt} avatar`}
												width={80}
												height={80}
												className="!h-10 !w-10 rounded-full border-2 border-white"
											/>
											<p className="ml-2">{image.alt}</p>
										</div>
									</Link>
								);
							})}
						</div>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
}
