'use client';

/* eslint-disable no-mixed-spaces-and-tabs */
import {
  getActiveTaskIdCookie,
  getActiveUserTaskCookie,
  setActiveTaskIdCookie,
  setActiveUserTaskCookie
} from '@app/helpers';
import {
  ITaskLabelsItemList,
  ITaskStatusField,
  ITaskStatusStack,
  ITeamTask
} from '@app/interfaces';
import {
  createTeamTaskAPI,
  deleteTaskAPI,
  getTeamTasksAPI,
  updateTaskAPI,
  deleteEmployeeFromTasksAPI,
  getTasksByIdAPI,
  getTasksByEmployeeIdAPI,
  getAllDayPlansAPI,
  getMyDailyPlansAPI
} from '@app/services/client/api';
import {
  activeTeamState,
  activeTeamTaskId,
  dailyPlanListState,
  detailedTaskState,
  // employeeTasksState,
  memberActiveTaskIdState,
  myDailyPlanListState,
  userState,
  activeTeamTaskState,
  tasksByTeamState,
  tasksFetchingState,
  teamTasksState
} from '@app/stores';
import isEqual from 'lodash/isEqual';
import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { useSyncRef } from '../useSyncRef';
import { useOrganizationEmployeeTeams } from './useOrganizatioTeamsEmployee';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useTaskStatus } from './useTaskStatus';

export function useTeamTasks() {
  const {
    updateOrganizationTeamEmployeeActiveTask
  } = useOrganizationEmployeeTeams();
  const { user, $user } = useAuthenticateUser();

  const setAllTasks = useSetAtom(teamTasksState);
  const tasks = useAtomValue(tasksByTeamState);
  const [detailedTask, setDetailedTask] = useAtom(detailedTaskState);
  // const allTaskStatistics = useAtomValue(allTaskStatisticsState);
  const tasksRef = useSyncRef(tasks);

  const [tasksFetching, setTasksFetching] = useAtom(tasksFetchingState);
  const authUser = useSyncRef(useAtomValue(userState));
  const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
  const $memberActiveTaskId = useSyncRef(memberActiveTaskId);
  // const [employeeState, setEmployeeState] = useAtom(employeeTasksState);
  const { taskStatus } = useTaskStatus();
  const activeTeam = useAtomValue(activeTeamState);
  const activeTeamRef = useSyncRef(activeTeam);

  const [activeTeamTask, setActiveTeamTask] = useAtom(activeTeamTaskState);

  const { firstLoad, firstLoadData: firstLoadTasksData } = useFirstLoad();

  const setDailyPlan = useSetAtom(dailyPlanListState);
  const setMyDailyPlans = useSetAtom(myDailyPlanListState);

  // Queries hooks
  const { queryCall, loading, loadingRef } = useQuery(getTeamTasksAPI);
  const {
    queryCall: getTasksByIdQueryCall,
    loading: getTasksByIdLoading
  } = useQuery(getTasksByIdAPI);
  const {
    queryCall: getTasksByEmployeeIdQueryCall,
    loading: getTasksByEmployeeIdLoading
  } = useQuery(getTasksByEmployeeIdAPI);

  const { queryCall: deleteQueryCall, loading: deleteLoading } = useQuery(
    deleteTaskAPI
  );

  const { queryCall: createQueryCall, loading: createLoading } = useQuery(
    createTeamTaskAPI
  );

  const { queryCall: updateQueryCall, loading: updateLoading } = useQuery(
    updateTaskAPI
  );

  const { queryCall: getAllQueryCall } = useQuery(getAllDayPlansAPI);
  const { queryCall: getMyDailyPlansQueryCall } = useQuery(getMyDailyPlansAPI);

  const {
    queryCall: deleteEmployeeFromTasksQueryCall,
    loading: deleteEmployeeFromTasksLoading
  } = useQuery(deleteEmployeeFromTasksAPI);

  const getAllDayPlans = useCallback(async () => {
    const response = await getAllQueryCall();

    if (response.data.items.length) {
      const { items, total } = response.data;
      setDailyPlan({ items, total });
    }
  }, [getAllQueryCall, setDailyPlan]);

  const getMyDailyPlans = useCallback(async () => {
    const response = await getMyDailyPlansQueryCall();

    if (response.data.items.length) {
      const { items, total } = response.data;
      setMyDailyPlans({ items, total });
    }
  }, [getMyDailyPlansQueryCall, setMyDailyPlans]);

  const getTaskById = useCallback(
    (taskId: string) => {
      tasksRef.current.forEach((task) => {
        if (task.id === taskId) {
          setDetailedTask(task);
        }
      });

      return getTasksByIdQueryCall(taskId).then((res) => {
        setDetailedTask(res?.data || null);
        return res;
      });
    },
    [getTasksByIdQueryCall, setDetailedTask, tasksRef]
  );

  const getTasksByEmployeeId = useCallback(
    (employeeId: string, organizationTeamId: string) => {
      return getTasksByEmployeeIdQueryCall(employeeId, organizationTeamId).then(
        (res) => {
          // setEmployeeState(res?.data || []);
          return res.data;
        }
      );
    },
    [getTasksByEmployeeIdQueryCall]
  );

  const deepCheckAndUpdateTasks = useCallback(
    (responseTasks: ITeamTask[], deepCheck?: boolean) => {
      if (responseTasks && responseTasks.length) {
        responseTasks.forEach((task) => {
          if (task.tags && task.tags?.length) {
            task.label = task.tags[0].name;
          }
        });
      }

      /**
       * When deepCheck enabled,
       * then update the tasks store only when active-team tasks have an update
       */
      if (deepCheck) {
        const latestActiveTeamTasks = responseTasks
          .filter((task) => {
            return task.teams.some((tm) => {
              return tm.id === activeTeamRef.current?.id;
            });
          })
          .sort((a, b) => a.title.localeCompare(b.title));

        const activeTeamTasks = tasksRef.current
          .slice()
          .sort((a, b) => a.title.localeCompare(b.title));

        if (!isEqual(latestActiveTeamTasks, activeTeamTasks)) {
          // Fetch plans with updated task(s)
          getMyDailyPlans();
          getAllDayPlans();
          setAllTasks(responseTasks);
        }
      } else {
        setAllTasks(responseTasks);
      }
    },
    [activeTeamRef, getAllDayPlans, getMyDailyPlans, setAllTasks, tasksRef]
  );

  const loadTeamTasksData = useCallback(
    (deepCheck?: boolean) => {
      if (loadingRef.current || !user || !activeTeamRef.current?.id) {
        return new Promise((response) => {
          response(true);
        });
      }

      return queryCall(
        user?.employee.organizationId,
        user?.employee.tenantId,
        activeTeamRef.current?.projects &&
          activeTeamRef.current?.projects.length
          ? activeTeamRef.current?.projects[0].id
          : '',
        activeTeamRef.current?.id || ''
      ).then((res) => {
        deepCheckAndUpdateTasks(res?.data?.items || [], deepCheck);
        return res;
      });
    },
    [queryCall, deepCheckAndUpdateTasks, loadingRef, user, activeTeamRef]
  );

  // Global loading state
  useEffect(() => {
    if (firstLoad) {
      setTasksFetching(loading);
    }
  }, [loading, firstLoad, setTasksFetching]);

  const setActiveUserTaskCookieCb = useCallback(
    (task: ITeamTask | null) => {
      if (task?.id && authUser.current?.id) {
        setActiveUserTaskCookie({
          taskId: task?.id,
          userId: authUser.current?.id
        });
      } else {
        setActiveUserTaskCookie({
          taskId: '',
          userId: ''
        });
      }
    },
    [authUser]
  );

  // Reload tasks after active team changed
  useEffect(() => {
    if (activeTeam?.id && firstLoad) {
      loadTeamTasksData();
    }
  }, [activeTeam?.id, firstLoad, loadTeamTasksData]);
  const setActive = useSetAtom(activeTeamTaskId);

  // Get the active task from cookie and put on global store
  useEffect(() => {
    if (firstLoad) {
      const active_user_task = getActiveUserTaskCookie();
      const active_taskid =
        active_user_task?.userId === authUser.current?.id
          ? active_user_task?.taskId
          : getActiveTaskIdCookie() || '';

      setActiveTeamTask(tasks.find((ts) => ts.id === active_taskid) || null);
    }
  }, [setActiveTeamTask, tasks, firstLoad, authUser]);

  // Queries calls
  const deleteTask = useCallback(
    (task: typeof tasks[0]) => {
      return deleteQueryCall(task.id).then((res) => {
        const affected = res.data?.affected || 0;
        if (affected > 0) {
          setAllTasks((ts) => {
            return ts.filter((t) => t.id !== task.id);
          });
        }
        return res;
      });
    },
    [deleteQueryCall, setAllTasks]
  );

  const createTask = useCallback(
    (
      {
        taskName,
        issueType,
        taskStatusId,
        status = taskStatus[0]?.name,
        priority,
        size,
        tags,
        description
      }: {
        taskName: string;
        issueType?: string;
        status?: string;
        taskStatusId: string;
        priority?: string;
        size?: string;
        tags?: ITaskLabelsItemList[];
        description?: string | null;
      },
      members?: { id: string }[]
    ) => {
      return createQueryCall(
        {
          title: taskName,
          issueType,
          status,
          priority,
          size,
          tags,
          // Set Project Id to cookie
          // TODO: Make it dynamic when we add Dropdown in Navbar
          ...(activeTeam?.projects && activeTeam?.projects.length > 0
            ? {
                projectId: activeTeam.projects[0].id
              }
            : {}),
          ...(description ? { description: `<p>${description}</p>` } : {}),
          ...(members ? { members } : {}),
          taskStatusId: taskStatusId
        },
        $user.current
      ).then((res) => {
        deepCheckAndUpdateTasks(res?.data?.items || [], true);
        return res;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createQueryCall, deepCheckAndUpdateTasks, activeTeam]
  );

  const updateTask = useCallback(
    (task: Partial<ITeamTask> & { id: string }) => {
      return updateQueryCall(task.id, task).then((res) => {
        setActive({
          id: ''
        });
        const updatedTasks = res?.data?.items || [];
        deepCheckAndUpdateTasks(updatedTasks, true);

        if (detailedTask) {
          getTaskById(detailedTask.id);
        }

        return res;
      });
    },
    [
      updateQueryCall,
      setActive,
      deepCheckAndUpdateTasks,
      detailedTask,
      getTaskById
    ]
  );

  const updateTitle = useCallback(
    (newTitle: string, task?: ITeamTask | null, loader?: boolean) => {
      if (task && newTitle !== task.title) {
        loader && setTasksFetching(true);
        return updateTask({
          ...task,
          title: newTitle
        }).then((res) => {
          setTasksFetching(false);
          return res;
        });
      }
      return Promise.resolve();
    },
    [updateTask, setTasksFetching]
  );

  const updateDescription = useCallback(
    (newDescription: string, task?: ITeamTask | null, loader?: boolean) => {
      if (task && newDescription !== task.description) {
        loader && setTasksFetching(true);
        return updateTask({
          ...task,
          description: newDescription
        }).then((res) => {
          setTasksFetching(false);
          return res;
        });
      }
      return Promise.resolve();
    },
    [updateTask, setTasksFetching]
  );

  const updatePublicity = useCallback(
    (publicity: boolean, task?: ITeamTask | null, loader?: boolean) => {
      if (task && publicity !== task.public) {
        loader && setTasksFetching(true);
        return updateTask({
          ...task,
          public: publicity
        }).then((res) => {
          setTasksFetching(false);
          return res;
        });
      }
      return Promise.resolve();
    },
    [updateTask, setTasksFetching]
  );

  const handleStatusUpdate = useCallback(
    <T extends ITaskStatusField>(
      status: ITaskStatusStack[T],
      field: T,
      taskStatusId: ITeamTask['taskStatusId'],
      task?: ITeamTask | null,
      loader?: boolean
    ) => {
      if (task && status !== task[field]) {
        loader && setTasksFetching(true);

        if (field === 'status' && status === 'closed') {
          const active_user_task = getActiveUserTaskCookie();
          if (active_user_task?.taskId === task.id) {
            setActiveUserTaskCookie({
              taskId: '',
              userId: ''
            });
          }
          const active_task_id = getActiveTaskIdCookie();
          if (active_task_id === task.id) {
            setActiveTaskIdCookie('');
          }
        }

        return updateTask({
          ...task,
          taskStatusId: taskStatusId ?? task.taskStatusId,
          [field]: status
        }).then((res) => {
          setTasksFetching(false);
          return res;
        });
      }

      return Promise.resolve();
    },
    [updateTask, setTasksFetching]
  );

  /**
   * Change active task
   */
  const setActiveTask = useCallback(
    (task: ITeamTask | null) => {
      /**
       * Unassign previous active task
       */
      if ($memberActiveTaskId.current && $user.current) {
        const _task = tasksRef.current.find(
          (t) => t.id === $memberActiveTaskId.current
        );

        if (_task) {
          updateTask({
            ..._task,
            members: _task.members.filter(
              (m) => m.id !== $user.current?.employee.id
            )
          });
        }
      }

      setActiveTaskIdCookie(task?.id || '');
      setActiveTeamTask(task);
      setActiveUserTaskCookieCb(task);

      if (task) {
        // Update Current user's active task to sync across multiple devices
        const currentEmployeeDetails = activeTeam?.members.find(
          (member) => member.employeeId === authUser.current?.employee?.id
        );

        if (currentEmployeeDetails && currentEmployeeDetails.id) {
          updateOrganizationTeamEmployeeActiveTask(currentEmployeeDetails.id, {
            organizationId: task.organizationId,
            activeTaskId: task.id,
            organizationTeamId: activeTeam?.id,
            tenantId: activeTeam?.tenantId
          });
        }
      }
    },
    [
      setActiveTeamTask,
      setActiveUserTaskCookieCb,
      updateOrganizationTeamEmployeeActiveTask,
      activeTeam,
      authUser,
      $memberActiveTaskId,
      $user,
      tasksRef,
      updateTask
    ]
  );

  const deleteEmployeeFromTasks = useCallback(
    (employeeId: string, organizationTeamId: string) => {
      deleteEmployeeFromTasksQueryCall(employeeId, organizationTeamId);
    },
    [deleteEmployeeFromTasksQueryCall]
  );

  const unassignAuthActiveTask = useCallback(() => {
    setActiveTaskIdCookie('');
    setActiveTeamTask(null);
  }, [setActiveTeamTask]);

  useEffect(() => {
    const memberActiveTask = tasks.find(
      (item) => item.id === memberActiveTaskId
    );
    if (memberActiveTask) {
      setActiveTeamTask(memberActiveTask);
    }
  }, [activeTeam, tasks, memberActiveTaskId, setActiveTeamTask]);

  return {
    tasks,
    loading,
    tasksFetching,
    deleteTask,
    deleteLoading,
    createTask,
    createLoading,
    updateTask,
    updateLoading,
    setActiveTask,
    activeTeamTask,
    firstLoadTasksData,
    updateTitle,
    updateDescription,
    updatePublicity,
    handleStatusUpdate,
    // employeeState,
    getTasksByEmployeeId,
    getTasksByEmployeeIdLoading,
    activeTeam,
    activeTeamId: activeTeam?.id,
    unassignAuthActiveTask,
    setAllTasks,
    loadTeamTasksData,
    deleteEmployeeFromTasks,
    deleteEmployeeFromTasksLoading,
    getTaskById,
    getTasksByIdLoading,
    detailedTask
  };
}
