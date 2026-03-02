import { Button } from '@/core/components';
import { useState, useEffect, useRef } from 'react';
import { SearchNormalIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
import { InputField } from '../../duplicated-components/_input';
import { cn } from '@/core/lib/helpers';

const KanbanSearch = ({
	setSearchTasks,
	searchTasks,
	className
}: {
	setSearchTasks: (value: string) => void;
	searchTasks: string;
	className?: string;
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const searchRef: any = useRef(null);
	const t = useTranslations();

	// Handle click outside search box to collapse
	const handleClickOutside = (event: any) => {
		if (searchRef.current && !searchRef.current.contains(event.target)) {
			setIsExpanded(false);
		}
	};

	useEffect(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Handle click on search box to expand
	const handleSearchClick = () => {
		setIsExpanded(true);
	};

	return (
		<div onClick={() => handleSearchClick()} ref={searchRef}>
			<InputField
				type="text"
				value={searchTasks}
				onChange={({ target }) => setSearchTasks(target.value)}
				placeholder={t('common.SEARCH')}
				className={cn(
					`mb-0 h-8 text-sm transition-all bg-transparent! border-none focus:ring-0`,
					isExpanded ? 'w-64' : 'w-44'
				)}
				wrapperClassName={className}
				leadingNode={
					<Button
						variant="ghost"
						className="p-0 m-0 ml-[0.9rem] min-w-0 absolute right-3 h-8 w-8 flex items-center justify-center"
						type="submit"
					>
						<SearchNormalIcon className="w-3.5 h-3.5" />
					</Button>
				}
			/>
		</div>
	);
};

export default KanbanSearch;
