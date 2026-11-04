/** Everything the PDF prints, already translated and formatted, so the document only lays it out. */
export interface AppsUrlsPdfLine {
	key: string;
	lead: string;
	member: string;
	project: string;
	time: string;
	share: string;
}

export interface AppsUrlsPdfGroup {
	key: string;
	label: string;
	meta: string;
	time: string;
	share: string;
	lines: AppsUrlsPdfLine[];
}

export interface AppsUrlsPdfData {
	title: string;
	subtitle: string;
	generated: string;
	figures: Array<{ label: string; value: string }>;
	columns: { lead: string; member: string; project: string; time: string; share: string };
	showsMember: boolean;
	showsProject: boolean;
	groups: AppsUrlsPdfGroup[];
	totals: { label: string; time: string };
}
