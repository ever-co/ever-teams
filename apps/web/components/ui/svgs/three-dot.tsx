export default function ThreeDotIcon({
    width=20,
    height=20,
    color="white"
}: {
    width?: number,
    height?: number,
    color?: string
}) {
    return (
        <>
            <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 256 256"><path fill={color} d="M128 96a32 32 0 1 0 32 32a32 32 0 0 0-32-32Zm0 40a8 8 0 1 1 8-8a8 8 0 0 1-8 8Zm80-40a32 32 0 1 0 32 32a32 32 0 0 0-32-32Zm0 40a8 8 0 1 1 8-8a8 8 0 0 1-8 8ZM48 96a32 32 0 1 0 32 32a32 32 0 0 0-32-32Zm0 40a8 8 0 1 1 8-8a8 8 0 0 1-8 8Z"/></svg>
        </>
    )
}