export interface IIntegrationType {
	id: string;
	createdAt: string | Date;
	updatedAt: string | Date;
	name: string;
	description: string | null;
	icon: string | null;
	groupName: string;
	order: number;
}
