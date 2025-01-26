'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { members } from '../data/mock-data';
import { ITimerLogGrouped } from '@/app/interfaces';
import { Spinner } from '@/components/ui/loaders/spinner';

const getProgressColor = (activityLevel: string) => {
	const level = parseInt(activityLevel, 10);
	if (isNaN(level) || level < 0) return 'bg-gray-300';
	if (level > 100) return 'bg-green-500';
	if (level <= 20) return 'bg-red-500';
	if (level <= 50) return 'bg-yellow-500';
	return 'bg-green-500';
};

export function TeamStatsTable({ rapportDailyActivity, isLoading }: { rapportDailyActivity?: ITimerLogGrouped[], isLoading?: boolean }) {
	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-[400px]">
				<Spinner />
			</div>
		);
	}

	if (!rapportDailyActivity?.length) {
		return (
			<div className="flex justify-center items-center min-h-[400px] text-gray-500">
				No data available
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="overflow-auto relative w-full">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Member</TableHead>
							<TableHead>Tracked Time</TableHead>
							<TableHead>Manual Time</TableHead>
							<TableHead>Idle Time</TableHead>
							<TableHead>Unknown Activity</TableHead>
							<TableHead>Activity Level</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map((member) => (
							<TableRow key={member.name}>
								<TableCell className="font-medium">
									<div className="flex gap-2 items-center">
										<Avatar className="w-8 h-8">
											<AvatarImage src={member.avatar} alt={member.name} />
											<AvatarFallback>{member.name[0]}</AvatarFallback>
										</Avatar>
										{member.name}
									</div>
								</TableCell>
								<TableCell>{member.trackedTime}</TableCell>
								<TableCell>{member.manualTime}</TableCell>
								<TableCell>{member.idleTime}</TableCell>
								<TableCell>{member.unknownActivity}</TableCell>
								<TableCell>
									<div className="flex gap-2 items-center">
										<div className="w-full h-2 bg-gray-100 rounded-full">
											<div
												className={`h-full rounded-full ${getProgressColor(member.activityLevel)}`}
												style={{ width: member.activityLevel }}
											/>
										</div>
										<span className="w-9 text-sm">{member.activityLevel}</span>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<div className="flex justify-between items-center px-2">
				<div className="flex items-center space-x-6">
					<p className="text-sm text-gray-500">
						Showing 1 to {members.length} of {members.length} entries
					</p>
				</div>
				<div className="flex items-center space-x-2">
					<Button variant="outline" size="icon" disabled>
						<ChevronsLeft className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="icon" disabled>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="sm">
						1
					</Button>
					<Button variant="outline" size="icon">
						<ChevronRight className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="icon">
						<ChevronsRight className="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
