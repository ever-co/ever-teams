'use client';

import { useCallback, useEffect } from 'react';
import { useQuery } from '../useQuery';
import { useAtom, useAtomValue } from 'jotai';
import { timeSlotsState } from '@app/stores/time-slot';
import moment from 'moment';
import { useAuthenticateUser } from './useAuthenticateUser';
import {
  deleteTimerLogsRequestAPI,
  getTimerLogsRequestAPI
} from '@app/services/client/api';
import { useUserProfilePage } from './useUserProfilePage';
import { activityTypeState } from '@app/stores/activity-type';

export function useTimeSlots(hasFilter?: boolean) {
  const { user } = useAuthenticateUser();
  const [timeSlots, setTimeSlots] = useAtom(timeSlotsState);
  const activityFilter = useAtomValue(activityTypeState);
  const profile = useUserProfilePage();

  const { loading, queryCall } = useQuery(getTimerLogsRequestAPI);
  const { loading: loadingDelete, queryCall: queryDeleteCall } = useQuery(
    deleteTimerLogsRequestAPI
  );

  const getTimeSlots = useCallback(() => {
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const employeeId = activityFilter.member
      ? activityFilter.member?.employeeId
      : user?.employee?.id;
    if (
      activityFilter.member?.employeeId === user?.employee.id ||
      user?.role?.name?.toUpperCase() == 'MANAGER'
    ) {
      queryCall({
        tenantId: user?.tenantId ?? '',
        organizationId: user?.employee.organizationId ?? '',
        employeeId: employeeId ?? '',
        todayEnd,
        todayStart
      }).then((response) => {
        if (response.data && Array.isArray(response.data)) {
          setTimeSlots(response.data[0]?.timeSlots || []);
        }
      });
    } else setTimeSlots([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasFilter,
    activityFilter.member?.employeeId,
    profile.member?.employeeId,
    user?.id,
    queryCall,
    setTimeSlots
  ]);

  const deleteTimeSlots = useCallback(
    (ids: string[]) => {
      queryDeleteCall({
        tenantId: user?.tenantId ?? '',
        organizationId: user?.employee.organizationId ?? '',
        ids: ids
      }).then(() => {
        setTimeSlots((timeSlots) =>
          timeSlots.filter((el) => (!ids?.includes(el.id) ? el : null))
        );
      });
    },
    [queryDeleteCall, setTimeSlots, user]
  );

  useEffect(() => {
    getTimeSlots();
  }, [getTimeSlots]);

  return {
    timeSlots,
    getTimeSlots,
    deleteTimeSlots,
    loadingDelete,
    loading
  };
}
