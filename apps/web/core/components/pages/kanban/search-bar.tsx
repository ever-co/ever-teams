import { Button } from '@/core/components';
import { useState, useEffect, useRef } from 'react';
import { Search } from '@/core/components/icons';
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
				className={cn('mb-0 h-8 text-sm transition-[width]', isExpanded && 'w-64', !isExpanded && 'w-44')}
				wrapperClassName={className}
				leadingNode={
					<Button
						variant="ghost"
						size="icon-sm"
						className="absolute right-0.5 m-0 min-w-0 text-muted-foreground"
						type="submit"
					>
						<Search className="size-4" />
					</Button>
				}
			/>
		</div>
	);
};

export default KanbanSearch;
