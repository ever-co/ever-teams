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

export const dataSourceTimeSheet: TimeSheet[] = [
    {
        id: 1,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Approved",
        time: '08:00h'
    },
    {
        id: 2,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
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
