import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterButtonProps {}

const FilterButton: React.FC<FilterButtonProps> = () => {
	return (
		<Button variant="outline" className="flex gap-2.5 items-center">
			<Filter className="h-4 w-4" />
			<span className="font-bold">Filter</span>
		</Button>
	);
};

export default FilterButton;
