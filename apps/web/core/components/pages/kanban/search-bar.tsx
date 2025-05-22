import { Button } from '@/core/components';
import { useState, useEffect, useRef } from 'react';
import { SearchNormalIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
import { InputField } from '../../duplicated-components/_input';

const KanbanSearch = ({
	setSearchTasks,
	searchTasks
}: {
	setSearchTasks: (value: string) => void;
	searchTasks: string;
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
				className={`mb-0 h-10 transition-all ${isExpanded ? 'w-64' : 'w-44'} !bg-transparent`}
				leadingNode={
					<Button variant="ghost" className="p-0 m-0 ml-[0.9rem] min-w-0 absolute right-3" type="submit">
						<SearchNormalIcon className="w-4 h-4" />
					</Button>
				}
			/>
		</div>
	);
};

export default KanbanSearch;
