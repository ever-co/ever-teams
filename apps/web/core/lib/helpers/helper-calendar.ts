
export type timesheetCalendar = 'TimeSheet' | 'Calendar';

export const statusOptions = [
    { value: "Approved", label: "Approved" },
    { value: "Pending", label: "Pending" },
    { value: "Rejected", label: "Rejected" },
];

export type TimeSheet = {
    id: number,
    task: string,
    name: string,
    description: string,
    employee: string,
    status: "Approved" | "Pending" | "Rejected",
    time: string
}

export type headTimeSheet = {

    deletedAt: string,
    id: string,
    createdAt: Date | string,
    updatedAt: Date | string,
    isActive: boolean,
    isArchived: boolean,
    archivedAt: string,
    tenantId: string,
    organizationId: string,
    number: number | string,
    prefix: string,
    title: string,
    description: string,
    status: string,
    priority: string,
    size: string,
    issueType: string,
    estimate: number,
    dueDate: string,
    public: boolean,
    startDate: string,
    resolvedAt: string,
    version: string,
    isDraft: false,
    parentId: string,
    projectId: string,
    createdByUserId: string,
    organizationSprintId: string,
    taskStatusId: string,
    taskSizeId: string,
    taskPriorityId: string,
    members:
    {
        deletedAt: string,
        id: string,
        createdAt: Date | string,
        updatedAt: Date | string,
        isActive: true,
        isArchived: false,
        archivedAt: string,
        tenantId: string,
        organizationId: string,
        valueDate: string,
        short_description: string,
        description: string,
        startedWorkOn: string,
        endWork: string,
        payPeriod: string,
        billRateValue: 0,
        minimumBillingRate: 0,
        billRateCurrency: string,
        reWeeklyLimit: 0,
        offerDate: string,
        acceptDate: string,
        rejectDate: string,
        employeeLevel: string,
        anonymousBonus: string,
        averageIncome: string,
        averageBonus: string,
        totalWorkHours: string,
        averageExpenses: string,
        show_anonymous_bonus: string,
        show_average_bonus: string,
        show_average_expenses: string,
        show_average_income: string,
        show_billrate: string,
        show_payperiod: string,
        show_start_work_on: string,
        isJobSearchActive: string,
        linkedInUrl: string,
        facebookUrl: string,
        instagramUrl: string,
        twitterUrl: string,
        githubUrl: string,
        gitlabUrl: string,
        upworkUrl: string,
        stackoverflowUrl: string,
        isVerified: string,
        isVetted: string,
        totalJobs: string,
        jobSuccess: string,
        profile_link: string,
        isTrackingEnabled: false,
        isOnline: false,
        isAway: false,
        isTrackingTime: false,
        allowScreenshotCapture: true,
        allowManualTime: false,
        allowModifyTime: false,
        allowDeleteTime: false,
        upworkId: string,
        linkedInId: string,
        userId: string,
        contactId: string,
        organizationPositionId: string,
        user: {
            deletedAt: string,
            id: string,
            createdAt: Date | string,
            updatedAt: Date | string,
            isActive: boolean,
            isArchived: boolean,
            archivedAt: string,
            tenantId: string,
            thirdPartyId: string,
            firstName: string,
            lastName: string,
            email: string,
            phoneNumber: string,
            username: string,
            timeZone: number,
            imageUrl: string,
            preferredLanguage: string,
            preferredComponentLayout: string,
            lastLoginAt: string,
            roleId: string,
            imageId: string,
            defaultTeamId: string,
            lastTeamId: string,
            defaultOrganizationId: string,
            lastOrganizationId: string,
            image: string,
            name: string,
            isEmailVerified: true
        },
        fullName: string,
        isDeleted: false,
    }

    taskNumber: string

}

export const dataSourceTimeSheet: TimeSheet[] = [
    {
        id: 1,
        task: "#324 Working on UI Design & making prototype for user testing tomorrow  & making prototype for user testing tomorrow",
        name: "Ever Gauzy",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Approved",
        time: '08:00h'
    },
    {
        id: 2,
        task: "#321 Spike for creating calendar views on mobile",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Pending",
        time: '08:00h'
    },
    {
        id: 3,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Approved",
        time: '08:00h'
    },
    {
        id: 4,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Pending",
        time: '08:00h'
    },
    {
        id: 5,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Rejected",
        time: '06:00h'
    },
    {
        id: 6,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Pending",
        time: '06:00h'
    },
    {
        id: 7,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Approved",
        time: '06:00h'
    },
    {
        id: 8,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Approved",
        time: '06:00h'
    },
]
