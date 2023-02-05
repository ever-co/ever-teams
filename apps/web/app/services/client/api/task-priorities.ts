import api from '../axios'

export function getTaskPrioritiesList(tenantId: string, organizationId: string){
    return api.get(`/task-priorities?tenantId=${tenantId}&organizationId=${organizationId}`)
}