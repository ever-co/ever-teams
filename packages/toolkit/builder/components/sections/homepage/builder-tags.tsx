
export const BuilderTags = ({ tags }: { tags: string[] }) => (
    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-white/10 mt-auto">
        {tags.map((tag, index) => (
            <span key={index} className="px-3 py-2 text-xs bg-gray-100 dark:bg-[#242424] rounded-md text-gray-700 dark:text-white">
                {tag}
            </span>
        ))}
    </div>
);