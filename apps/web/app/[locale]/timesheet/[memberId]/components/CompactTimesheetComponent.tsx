import React from "react";

const LoadingSpinner = ({ className }: { className?: string }) => (
    <svg
        className={`text-gray-500 animate-spin ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
    >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        ></circle>
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        ></path>
    </svg>
);

const ImageWithLoader = ({ imageUrl, alt, className = "w-6 h-6 rounded-full" }:
    { imageUrl: string; alt: string; className?: string }) => {
    const [isLoading, setIsLoading] = React.useState(true);
    return (
        <div className="relative">
            {isLoading && (
                <div className="flex absolute inset-0 justify-center items-center bg-gray-200 rounded-full">
                    <LoadingSpinner className="w-5 h-5" />
                </div>
            )}
            <img
                className={className}
                src={imageUrl}
                alt={alt}
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
            />
        </div>
    );
};

export const EmployeeAvatar = ({ imageUrl, className }: { imageUrl: string, className?: string }) => (
    <ImageWithLoader className={className} imageUrl={imageUrl} alt="Employee" />
);


export const ProjectLogo = ({ imageUrl, className }: { imageUrl: string, className?: string }) => (
    <ImageWithLoader className={className} imageUrl={imageUrl} alt="Project Logo" />
);
