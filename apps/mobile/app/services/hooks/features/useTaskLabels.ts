import { useCallback, useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStores } from '../../../models';
import useFetchAllLabels from '../../client/queries/task/task-labels';
import { createLabelRequest, deleteTaskLabelRequest, updateTaskLabelsRequest } from '../../client/requests/task-label';
import { ITaskLabelCreate, ITaskLabelItem } from '../../interfaces/ITaskLabel';
import { ITaskStatusCreate } from '../../interfaces/ITaskStatus';

/**
 * Hook for managing task labels with CRUD operations
 * @returns Object containing labels data and operations
 */
export function useTaskLabels() {
  const queryClient = useQueryClient();
  const {
    authenticationStore: { authToken, tenantId, organizationId },
    teamStore: { activeTeamId }
  } = useStores();

  // State to store task labels
  const [allTaskLabels, setAllTaskLabels] = useState<ITaskLabelItem[]>([]);

  // Fetch labels using React Query hook
  const {
    data: labels,
    isLoading,
    isSuccess,
    isRefetching,
    refetch
  } = useFetchAllLabels({
    tenantId,
    organizationId,
    authToken
  });

  /**
   * Invalidates queries and refreshes data
   */
  const refreshLabels = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['labels'] });
    refetch();
  }, [queryClient, refetch]);

  /**
   * Delete a task label by ID
   * @param id - The ID of the label to delete
   */
  const deleteLabel = useCallback(async (id: string) => {
    if (!id) {
      throw new Error('Label ID is required for deletion');
    }

    try {
      await deleteTaskLabelRequest({
        id,
        tenantId,
        bearer_token: authToken
      });
      refreshLabels();
    } catch (error) {
      console.error('Error deleting label:', error);
      throw error;
    }
  }, [authToken, tenantId, refreshLabels]);

  /**
   * Update an existing task label
   * @param labelData - Label data with ID and properties to update
   */
  const updateLabel = useCallback(async (labelData: ITaskLabelItem) => {
    if (!labelData?.id) {
      throw new Error('Label ID is required for update');
    }

    try {
      const { id, ...data } = labelData;
      await updateTaskLabelsRequest({
        id,
        tenantId,
        datas: data as ITaskLabelCreate,
        bearer_token: authToken
      });
      refreshLabels();
    } catch (error) {
      console.error('Error updating label:', error);
      throw error;
    }
  }, [authToken, tenantId, refreshLabels]);

  /**
   * Create a new task label
   * @param data - Label properties
   * @returns The created label object
   */
  const createLabel = useCallback(async (data: ITaskLabelCreate) => {
    if (!data || !tenantId || !organizationId) {
      throw new Error('Missing required data for label creation');
    }

    try {
      const requestData = {
        tenantId,
        datas: {
          ...data,
          organizationId,
		  ...(activeTeamId ? { organizationTeamId: activeTeamId } : {})
        },
        bearer_token: authToken
      };

      const response = await createLabelRequest(requestData);
      refreshLabels();
      return response;
    } catch (error) {
      console.error('Error creating label:', error);
      throw error;
    }
  }, [authToken, tenantId, organizationId, activeTeamId, refreshLabels]);

  // Update local state when query data changes
  useEffect(() => {
    if (isSuccess && labels?.items) {
      setAllTaskLabels(labels.items);
    }
  }, [isSuccess, labels]);

  // Memoize the returned data to prevent unnecessary re-renders
  const returnData = useMemo(() => ({
    labels,
    isLoading: isLoading || isRefetching,
    deleteLabel,
    updateLabel,
    createLabel,
    allTaskLabels,
    refreshLabels
  }), [
    labels,
    isLoading,
    isRefetching,
    deleteLabel,
    updateLabel,
    createLabel,
    allTaskLabels,
    refreshLabels
  ]);

  return returnData;
}
