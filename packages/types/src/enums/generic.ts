// --------------------------------------------------
// 📦 USER - Permissions and Access
// --------------------------------------------------

export enum UserPermissionLevel {
	ADMIN = 20,
	MEMBER = 15,
	GUEST = 5,
}

// --------------------------------------------------
// 📦 PROJECT - Visibility and Networking
// --------------------------------------------------

export enum ProjectVisibility {
	PRIVATE = 0,
	PUBLIC = 2,
}

export enum ProjectPageAccess {
	PUBLIC = 0,
	PRIVATE = 1,
}

// --------------------------------------------------
// 📦 TIME FILTERS - Duration Filters for Views
// --------------------------------------------------

export enum DurationFilter {
	NONE = 'none',
	TODAY = 'today',
	THIS_WEEK = 'this_week',
	THIS_MONTH = 'this_month',
	THIS_YEAR = 'this_year',
	CUSTOM = 'custom',
}

// --------------------------------------------------
// 📦 ISSUE COMMENTS - Access Specifiers
// --------------------------------------------------

export enum IssueCommentVisibility {
	EXTERNAL = 'EXTERNAL',
	INTERNAL = 'INTERNAL',
}

// --------------------------------------------------
// 📦 ESTIMATION SYSTEMS
// --------------------------------------------------

export enum EstimateSystem {
	POINTS = 'points',
	CATEGORIES = 'categories',
	TIME = 'time',
}

export enum EstimateUpdateStage {
	CREATE = 'create',
	EDIT = 'edit',
	SWITCH = 'switch',
}

// --------------------------------------------------
// 📦 NOTIFICATIONS - Filtering by Type
// --------------------------------------------------

export enum NotificationFilterType {
	CREATED = 'created',
	ASSIGNED = 'assigned',
	SUBSCRIBED = 'subscribed',
}

// --------------------------------------------------
// 📦 FILES - Asset Management
// --------------------------------------------------

export enum EFileAssetType {
	COMMENT_DESCRIPTION = 'COMMENT_DESCRIPTION',
	ISSUE_ATTACHMENT = 'ISSUE_ATTACHMENT',
	ISSUE_DESCRIPTION = 'ISSUE_DESCRIPTION',
	DRAFT_ISSUE_DESCRIPTION = 'DRAFT_ISSUE_DESCRIPTION',
	PAGE_DESCRIPTION = 'PAGE_DESCRIPTION',
	PROJECT_COVER = 'PROJECT_COVER',
	PROJECT_DESCRIPTION = 'PROJECT_DESCRIPTION',
	USER_AVATAR = 'USER_AVATAR',
	USER_COVER = 'USER_COVER',
	WORKSPACE_LOGO = 'WORKSPACE_LOGO',
	TEAM_SPACE_DESCRIPTION = 'TEAM_SPACE_DESCRIPTION',
	TEAM_SPACE_COMMENT_DESCRIPTION = 'TEAM_SPACE_COMMENT_DESCRIPTION',
	INITIATIVE_DESCRIPTION = 'INITIATIVE_DESCRIPTION',
}
