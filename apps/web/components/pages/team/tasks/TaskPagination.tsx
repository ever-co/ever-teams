import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, onPageSizeChange }) => {
	return (
		<div className="flex flex-wrap gap-10 justify-between items-start mt-8 mr-10 ml-7 w-full max-w-screen-xl font-semibold leading-none max-md:mr-2.5 max-md:max-w-full">
			<div className="flex gap-4 text-xs tracking-tight text-gray-400 whitespace-nowrap rounded-none min-w-[240px] w-[284px]">
				<Button
					variant="outline"
					size="icon"
					onClick={() => onPageChange(Math.max(1, currentPage - 1))}
					disabled={currentPage === 1}
				>
					<ChevronLeft className="w-4 h-4" />
				</Button>
				<div className="flex">
					{[...Array(totalPages)].map((_, index) => (
						<Button
							key={index}
							variant={currentPage === index + 1 ? 'default' : 'outline'}
							className="w-9 h-9"
							onClick={() => onPageChange(index + 1)}
						>
							{index + 1}
						</Button>
					))}
				</div>
				<Button
					variant="outline"
					size="icon"
					onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
					disabled={currentPage === totalPages}
				>
					<ChevronRight className="w-4 h-4" />
				</Button>
			</div>
			<div className="flex flex-wrap gap-6 items-center text-sm tracking-tight text-gray-900 min-w-[240px] max-md:max-w-full">
				<div className="flex gap-2.5 items-start self-stretch my-auto whitespace-nowrap">
					<Button
						variant="outline"
						className="gap-3 self-stretch py-3 pr-2.5 pl-4 min-h-[36px] w-[92px]"
						onClick={() => onPageChange(1)}
					>
						First
					</Button>
					<Button
						variant="outline"
						className="gap-3 self-stretch py-3 pr-2.5 pl-4 min-h-[36px] w-[92px]"
						onClick={() => onPageChange(totalPages)}
					>
						Last
					</Button>
				</div>
				<Select onValueChange={(value) => onPageSizeChange(Number(value))}>
					<SelectTrigger className="w-[120px]">
						<SelectValue placeholder="Show 10" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="10">Show 10</SelectItem>
						<SelectItem value="20">Show 20</SelectItem>
						<SelectItem value="50">Show 50</SelectItem>
					</SelectContent>
				</Select>
				<div className="self-stretch my-auto text-xs tracking-tight">
					Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalPages * 10)} of{' '}
					{totalPages * 10} entries
				</div>
			</div>
		</div>
	);
};

export default Pagination;
