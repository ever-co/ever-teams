'use client';

import { Label, Input, Button, Card, CardContent, CardHeader, CardTitle, CardFooter } from '@ever-teams/toolkit-ui';
import { Loader2, PlusCircle } from 'lucide-react';
import { use, useActionState } from 'react';

import { useUser } from '@/lib/auth';
import { JSX } from 'react';
import { inviteTeamMember } from '../../(login)/actions';

type ActionState = {
	error?: string;
	success?: string;
};

export function InviteTeamMember(): JSX.Element {
	const { userPromise } = useUser();
	const user = use(userPromise);
	const isOwner = user?.role === 'owner';
	const [inviteState, inviteAction, isInvitePending] = useActionState<ActionState, FormData>(inviteTeamMember, {
		error: '',
		success: ''
	});

	return (
		<Card className="dark:border-gray-800">
			<CardHeader>
				<CardTitle>Invite Team Member</CardTitle>
			</CardHeader>
			<CardContent>
				<form action={inviteAction} className="space-y-4">
					<div>
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder="Enter email"
							required
							disabled={!isOwner}
						/>
					</div>
					<div>
						<Label>Role</Label>
						{/* <RadioGroup defaultValue="member" name="role" className="flex space-x-4" disabled={!isOwner}>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="member" id="member" />
								<Label htmlFor="member">Member</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="owner" id="owner" />
								<Label htmlFor="owner">Owner</Label>
							</div>
						</RadioGroup> */}
					</div>
					{inviteState?.error && <p className="text-red-500">{inviteState.error}</p>}
					{inviteState?.success && <p className="text-green-500">{inviteState.success}</p>}
					<Button
						type="submit"
						className="bg-orange-500 hover:bg-orange-600 text-white"
						disabled={isInvitePending || !isOwner}
					>
						{isInvitePending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Inviting...
							</>
						) : (
							<>
								<PlusCircle className="mr-2 h-4 w-4" />
								Invite Member
							</>
						)}
					</Button>
				</form>
			</CardContent>
			{!isOwner && (
				<CardFooter>
					<p className="text-sm text-muted-foreground">You must be a team owner to invite new members.</p>
				</CardFooter>
			)}
		</Card>
	);
}
