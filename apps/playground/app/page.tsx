'use client';
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@ever-teams/ui';
export default function Home() {
	return (
		<div>
			<h1>Hello World</h1>
			<Button>Click me</Button>
			<Button variant="destructive">Click me</Button>
			<Card className="bg-black text-gray-50">
				<CardHeader>
					<CardTitle>Card Title</CardTitle>
				</CardHeader>
				<CardContent>
					<p>Card Content</p>
				</CardContent>
			</Card>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button>Click me</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="bg-red-500">
					<DropdownMenuItem>Item 1</DropdownMenuItem>
					<DropdownMenuItem>Item 2</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
