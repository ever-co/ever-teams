import Link from "next/link";
import Image from "next/image";
import { Tooltip } from 'lib/components';

export interface IImageOverlapper {
    id: string;
    url: string;
    alt: string;
}

export default function ImageOverlapper({
    images,
    radius=20,
    displayImageCount=4
}: {
    images: IImageOverlapper[],
    radius?: number,
    displayImageCount?: number
}) {

    const imageRadius = radius;
    const imageLength = images.length;
	const numberOfImagesDisplayed = displayImageCount;
	const totalLength = (imageLength + 1) * imageRadius;

    const stackImages = (index: number, length: number) => {
        const total_length = (length + 1) * imageRadius;
        return {
            zIndex: (index + 1).toString(),
            right: `calc(${total_length - imageRadius * (index + 2)}px)`
        };
    };

    return (
        <div className="relative ">
            <div className="flex h-fit flex-row justify-end items-center relative"
                style={{
                    width: `${totalLength}px`
                }}
            >
                {images.map((image: IImageOverlapper, index: number) => {
                    if (index < numberOfImagesDisplayed) {
                    return (
                            <Link href={`/profile/${image.id}`} className="relative w-[40px] h-[40px]" key={index}>
                                <Tooltip label={image.alt} placement="top-start">
                                    <Image
                                        src={image.url}
                                        alt={`${image.alt} avatar`}
                                        fill={true}
                                        className="absolute rounded-full border-2 border-white"
                                        style={stackImages(index, imageLength)}
                                    />
                                </Tooltip>
                            </Link>
                    );
                    }
                })}
                {images.length > numberOfImagesDisplayed && (
                    <div
                        className="flex flex-row text-sm text-[#282048] dark:text-white font-semibold items-center justify-center absolute h-[40px] w-[40px] rounded-full border-2 border-[#0000001a] dark:border-white bg-white dark:bg-[#191A20]"
                        style={stackImages(numberOfImagesDisplayed, imageLength)}
                    >
                        {(imageLength - numberOfImagesDisplayed) < 100 ? (imageLength - numberOfImagesDisplayed) : 99}+
                    </div>
                )}
            </div>
		</div>
    )
}