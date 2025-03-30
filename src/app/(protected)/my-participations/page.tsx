'use client';

import { ParticipationList } from '@/components/participation-list';
import { getPollRunsByParticipant } from '@/app/actions/poll_run';
import { getPoll } from '@/app/actions/poll';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/context';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyParticipations() {
	const [participations, setParticipations] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const { userKey } = useUser();

	useEffect(() => {
		async function fetchParticipations() {
			if (userKey) {
				setLoading(true);
				try {
					const response = await getPollRunsByParticipant(userKey);

					if (response.success && response.pollRuns) {
						const enhancedPollRuns = await Promise.all(
							response.pollRuns.map(async (pollRun) => {
								try {
									// Extract pollId from the response
									const pollId = pollRun.pollKey.split(':')[1];

									// Get poll details
									const pollDetails = await getPoll(pollId);

									// Format date
									const formattedDate = new Date(parseInt(pollRun.created));

									return {
										pollRunId: pollRun.pollRunId,
										pollId: pollId,
										pollName: pollDetails?.name || 'Unnamed Poll',
										description: pollDetails?.description || '',
										participatedAt: formattedDate,
										participants: pollRun.participantsCount || '0',
										questionCount: pollRun.questionCount || '0',
									};
								} catch (error) {
									console.error(`Failed to fetch details for poll ${pollRun.pollRunId}:`, error);
									return {
										pollRunId: pollRun.pollRunId,
										pollId: pollRun.pollId,
										pollName: 'Unnamed Poll',
										description: '',
										participatedAt: new Date(),
										participants: pollRun.participantsCount || '0',
									};
								}
							})
						);
						setParticipations(enhancedPollRuns);
					} else {
						setParticipations([]);
					}
				} catch (error) {
					console.error('Failed to fetch participations:', error);
					setParticipations([]);
				} finally {
					setLoading(false);
				}
			}
		}

		fetchParticipations();
	}, [userKey]);

	if (loading) {
		return (
			<div className="container mx-auto py-6">
				<h1 className="text-3xl font-bold mb-6">Meine Teilnahmen</h1>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{[...Array(4)].map((_, i) => (
						<Skeleton key={i} className="h-48 w-full" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6">
			<h1 className="text-3xl font-bold mb-6">Meine Teilnahmen</h1>
			<ParticipationList participations={participations} isOwner={false} />
		</div>
	);
}
