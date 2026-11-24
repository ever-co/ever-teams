/** The billable fields of a timer start or a time entry, as the API reads them. */
export interface BillableFields {
	isBillable?: boolean;
	billableFromProject?: boolean;
}

/**
 * How a timer start or a time entry asks to be billable: as the caller chose, else as its project is set, as in the
 * Ever Teams web app (ever-co/ever-teams#5571). `fallback` is what time without a project gets, and what an API that
 * does not know `billableFromProject` yet records, as before.
 *
 * @param choice The caller's `isBillable`, if it gave one.
 * @param fallback The `isBillable` sent when the caller gave none; left out, none is sent.
 */
export function billableFieldsOf(choice: boolean | undefined, fallback?: boolean): BillableFields {
	if (choice !== undefined) {
		return { isBillable: choice };
	}
	if (fallback === undefined) {
		return { billableFromProject: true };
	}
	return { isBillable: fallback, billableFromProject: true };
}
