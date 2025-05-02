import { useCallback, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStores } from '../../../models';
import useFetchAllStatuses from '../../client/queries/task/task-status';
import {
  createStatusRequest,
  deleteTaskStatusRequest,
  updateTaskStatusRequest
} from '../../client/requests/task-status';
import { ITaskStatusCreate, ITaskStatusItem } from '../../interfaces/ITaskStatus';

/**
 * Custom hook for managing task statuses
 * Provides functions to create, update, delete, and fetch task statuses
 */
export function useTaskStatus() {
  const queryClient = useQueryClient();
  const {
    authenticationStore: { authToken, tenantId, organizationId },
    teamStore: { activeTeamId }
  } = useStores();

  // Keep allStatuses state to maintain backward compatibility
  const [allStatuses, setAllStatuses] = useState<ITaskStatusItem[]>([]);

  // Fetch all task statuses
  const {
    data: statuses,
    isLoading,
    isSuccess,
    isRefetching,
    refetch
  } = useFetchAllStatuses({
    tenantId,
    organizationId,
    activeTeamId,
    authToken
  });

  // Update allStatuses when statuses change
  useEffect(() => {
    if (statuses?.items) {
      setAllStatuses(statuses.items);
    }
  }, [statuses]);

  // Delete a task status by ID
  const deleteStatus = useCallback(async (id: string) => {
    await deleteTaskStatusRequest({
      id,
      tenantId,
      bearer_token: authToken
    });
    queryClient.invalidateQueries({ queryKey: ['statuses'] });
  }, [authToken, tenantId, queryClient]);

  // Update an existing task status
  const updateStatus = useCallback(async (id: string, data: ITaskStatusCreate) => {
    await updateTaskStatusRequest({
      id,
      tenantId,
      datas: data,
      bearer_token: authToken
    });
    queryClient.invalidateQueries({ queryKey: ['statuses'] });
  }, [authToken, tenantId, queryClient]);

  // Create a new task status
  const createStatus = useCallback(
    async (data: ITaskStatusCreate) => {
      if (!data || !tenantId || !organizationId || !activeTeamId) {
        return null;
      }

      try {
        // Format and prepare the data
        const cleanName = data.name.trim();

        const requestData = {
          name: cleanName,
          value: cleanName.split(' ').join('-').toLowerCase(),
          color: data.color.substring(0, 7), // Remove alpha channel if present
          icon: data.icon,
          organizationId: organizationId,
          organizationTeamId: activeTeamId, // Critical for filter matching
          template: data.template
        };

        // Create the status
        const response = await createStatusRequest(requestData, authToken, tenantId);

        // Refresh the data immediately
        queryClient.invalidateQueries({ queryKey: ['statuses'] });
        await refetch();

        return response;
      } catch (error) {
        console.error('Failed to create task status:', error);
        throw error;
      }
    },
    [authToken, tenantId, organizationId, activeTeamId, queryClient, refetch]
  );

  return {
    statuses,
    isLoading,
    isSuccess,
    isRefetching,
    deleteStatus,
    updateStatus,
    createStatus,
    allStatuses,
    setAllStatuses
  };
}
