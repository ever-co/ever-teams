export enum EProjectBilling {
	RATE = 'RATE',
	FLAT_FEE = 'FLAT_FEE',
	MILESTONES = 'MILESTONES'
}

export enum EProjectOwner {
	CLIENT = 'CLIENT',
	INTERNAL = 'INTERNAL'
}

export enum EMinimumProjectSize {
	ONE_THOUSAND = '1000+',
	FIVE_THOUSAND = '5000+',
	TEN_THOUSAND = '10000+',
	TWENTY_FIVE_THOUSAND = '25000+',
	FIFTY_THOUSAND = '50000+',
	ONE_HUNDRED_THOUSAND = '100000+'
}

export enum EProjectBudgetType {
	HOURS = 'hours',
	COST = 'cost'
}

export enum EProjectRelation {
	RelatedTo = 'related to',
	BlockedBy = 'blocked by',
	Blocking = 'blocking'
}
