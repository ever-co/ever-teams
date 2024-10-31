import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchButtonProps {}

const SearchButton: React.FC<SearchButtonProps> = () => {
	return (
		<Button variant="outline" className="flex gap-2.5 items-center w-[122px]">
			<Search className="h-4 w-4" />
			<span className="font-bold">Search</span>
		</Button>
	);
};

export default SearchButton;
