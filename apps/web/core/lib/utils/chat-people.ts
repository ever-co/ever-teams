import type { IChatPersonSummary } from '@/core/types/interfaces/common/chat';
import type { ChatPerson } from './chat-format';

export interface ChatPeople {
	byEmployee: Map<string, ChatPerson>;
	byUser: Map<string, ChatPerson>;
	list: ChatPerson[];
}

/**
 * The people names and pictures are looked up in: the members of the active team, as the app already shows them,
 * then everyone else of the organization from the platform's own list. A conversation is not bound to a team, so
 * without the second part a colleague of another team has no name, no picture, and cannot be written to.
 */
export function mergeChatPeople(teamPeople: readonly ChatPerson[], directory: readonly IChatPersonSummary[]): ChatPeople {
	const byEmployee = new Map<string, ChatPerson>();
	const byUser = new Map<string, ChatPerson>();
	const add = (person: ChatPerson) => {
		const held = byEmployee.get(person.employeeId);
		// The first entry stands; a later one only fills what it lacks.
		const entry: ChatPerson = held
			? { ...held, userId: held.userId || person.userId || null, name: held.name || person.name, imageUrl: held.imageUrl || person.imageUrl || null }
			: person;
		byEmployee.set(entry.employeeId, entry);
		if (entry.userId) byUser.set(entry.userId, entry);
	};
	for (const person of teamPeople) {
		if (person.employeeId) add(person);
	}
	for (const person of directory) {
		const employeeId = String(person.employeeId ?? '');
		if (!employeeId) continue;
		add({ employeeId, userId: person.userId ? String(person.userId) : null, name: String(person.name ?? '').trim(), imageUrl: person.imageUrl ?? null });
	}
	return { byEmployee, byUser, list: [...byEmployee.values()].filter((person) => person.name.length > 0) };
}
