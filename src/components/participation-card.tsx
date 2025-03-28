'use client';

import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { CalendarIcon, UsersIcon, View } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';

interface PollParticipation {
	pollRunId: string;
	pollId: string;
	pollName: string;
	description: string;
	participatedAt: string;
	questionCount: number;
	participants: number;
}

interface ParticipationCardProps {
	participation: PollParticipation;
	isOwner: boolean;
}

export function ParticipationCard({ participation, isOwner }: ParticipationCardProps) {
	const redirectViewLink = `/poll-result/${participation.pollRunId}`;

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
				<h2 className="text-2xl font-bold">{participation.pollName}</h2>
				<div className="text-sm text-muted-foreground">
					{new Date(participation.participatedAt).toLocaleDateString()}
				</div>
			</CardHeader>
			<CardContent className="space-y-4 flex-grow">
				<div className="flex flex-col space-y-1">
					<div className="flex items-center gap-2">
						<CalendarIcon className="h-4 w-4 text-muted-foreground" />
						<label className="text-base font-medium text-muted-foreground">Beschreibung:</label>
					</div>
					<p className="text-lg pl-6">{participation.description}</p>
				</div>

				<div className="flex flex-col space-y-1">
					<div className="flex items-center gap-2">
						<UsersIcon className="h-4 w-4 text-muted-foreground" />
						<label className="text-base font-medium text-muted-foreground">Anzahl Teilnehmer:</label>
					</div>
					<p className="text-lg pl-6">{participation.participants}</p>
				</div>
			</CardContent>
			<CardFooter className="flex pt-2 gap-2 w-full">
				<Link className="w-full" href={redirectViewLink}>
					<Button variant="outline" className="w-full flex items-center gap-2">
						<View className="h-4 w-4" />
						Details ansehen
					</Button>
				</Link>
			</CardFooter>
		</Card>
	);
}
