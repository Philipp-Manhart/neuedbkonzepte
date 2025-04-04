'use server';
import { redis } from '@/lib/redis';
import { nanoid } from 'nanoid';
import { pollIdConverter, keyConverter } from '@/lib/converter';

export async function createPoll(owner: string, name: string, description: string, defaultduration: string) {
	const pollId = nanoid();
	const pollKey = await pollIdConverter(pollId);
	const status = 'closed';

	const multi = redis.multi();

	multi.hSet(pollKey, {
		owner,
		name,
		description,
		status,
		defaultduration,
	});
	const timestamp = Date.now();
	multi.zAdd(`${owner}:polls`, { score: timestamp, value: pollKey });

	try {
		await multi.exec();
		return { success: true, pollId };
	} catch (error) {
		console.error('Fehler beim Erstellen der Umfrage:', error);
		return { success: false, error: 'Erstellung der Umfrage fehlgeschlagen' };
	}
}

export async function updatePoll(pollId: string, name: string, description: string, defaultduration: string) {
	try {
		const pollKey = await pollIdConverter(pollId);
		const poll = await redis.hGetAll(pollKey);
		if (!Object.keys(poll).length) {
			return { success: false, error: 'Abstimmung nicht vorhanden' };
		}

		await redis.hSet(pollKey, {
			name,
			description,
			defaultduration,
		});

		return { success: true, pollId };
	} catch (error) {
		console.error('Fehler beim Aktualisieren der Umfrage:', error);
		return { success: false, error: 'Aktualisierung der Umfrage fehlgeschlagen' };
	}
}

export async function deletePoll(pollId: string) {
	const pollKey = await pollIdConverter(pollId);
	const poll = await redis.hGetAll(pollKey);
	if (!Object.keys(poll).length) {
		return { success: false, error: 'Abstimmung nicht vorhanden' };
	}

	const multi = redis.multi();

	const questionKeys = await redis.zRange(`${pollKey}:questions`, 0, -1);
	for (const questionKey of questionKeys) {
		multi.del(questionKey);
	}

	multi.del(`${pollKey}:questions`);
	multi.del(pollKey);
	multi.zRem(`${poll.owner}:polls`, pollKey);

	try {
		await multi.exec();
		return { success: true };
	} catch (error) {
		console.error('Fehler beim Löschen der Umfrage:', error);
		return { success: false, error: 'Löschung der Umfrage fehlgeschlagen' };
	}
}

export async function getPoll(pollId: string) {
	try {
		const pollKey = await pollIdConverter(pollId);
		const poll = await redis.hGetAll(pollKey);
		if (!poll || Object.keys(poll).length === 0) {
			return { success: false, error: 'Abstimmung nicht vorhanden' };
		}
		const questionCount = await redis.zCard(`${pollKey}:questions`);

		return {
			...poll,
			pollId,
			questionCount,
		};
	} catch (error) {
		console.error('Fehler beim Abrufen der Umfrage:', error);
		return { success: false, error: 'Abrufen der Umfrage fehlgeschlagen' };
	}
}

export async function getPollsByOwner(userKey: string) {
	try {
		const pollKeys = await redis.zRange(`${userKey}:polls`, 0, -1, { REV: true });
		if (!pollKeys || pollKeys.length === 0) {
			return { success: false, error: 'Keine Abstimmungen vorhanden' };
		}

		const multi = redis.multi();

		for (const pollKey of pollKeys) {
			multi.hGetAll(pollKey);
		}

		const pollsData = await multi.exec();

		const questionCountsPromises = pollKeys.map((pollKey) => redis.zCard(`${pollKey}:questions`));
		const questionCounts = await Promise.all(questionCountsPromises);

		const pollsPromises = pollsData.map(async (result, index) => {
			const pollData = result || {};
			const pollKey = pollKeys[index];
			const pollId = await keyConverter(pollKey);
			return {
				pollId,
				questionCount: questionCounts[index] || 0,
				...pollData,
			};
		});

		const polls = await Promise.all(pollsPromises);

		return polls;
	} catch (error) {
		console.error('Fehler beim Abrufen der Umfragen:', error);
		return { success: false, error: 'Abrufen der Umfragen fehlgeschlagen' };
	}
}
