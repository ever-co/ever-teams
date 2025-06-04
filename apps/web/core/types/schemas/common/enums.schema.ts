import { z } from 'zod';
import { ERoleName } from '../../generics/enums/role';
import { ECurrencies } from '../../generics/enums/currency';
import { ETimeFormat, EDefaultValueDateType, EWeekDays } from '../../generics/enums/date';
import { EFileStorageProvider } from '../../generics/enums/file-storage';
import { EInviteStatus, EInvitationType } from '../../generics/enums/invite';
import { ETaskStatusName, ETaskPriority, ETaskSize, ETaskType } from '../../generics/enums/task';
import { ETimeLogSource, ETimerStatus } from '../../generics/enums/timer';

/**
 * Centralized Zod schemas for enums used across the application
 */

// Role related enums
export const roleNameSchema = z.nativeEnum(ERoleName);

// Timer related enums
export const timeLogSourceSchema = z.nativeEnum(ETimeLogSource);
export const timerStatusEnumSchema = z.nativeEnum(ETimerStatus);

// Date related enums
export const timeFormatSchema = z.nativeEnum(ETimeFormat);
export const defaultValueDateTypeSchema = z.nativeEnum(EDefaultValueDateType);
export const weekDaysSchema = z.nativeEnum(EWeekDays);

// Task related enums
export const taskStatusNameSchema = z.nativeEnum(ETaskStatusName);
export const taskPrioritySchema = z.nativeEnum(ETaskPriority);
export const taskSizeSchema = z.nativeEnum(ETaskSize);
export const taskTypeSchema = z.nativeEnum(ETaskType);

// File related enums
export const fileStorageProviderSchema = z.nativeEnum(EFileStorageProvider);

// Currency related enums
export const currenciesSchema = z.nativeEnum(ECurrencies);

// Invite related enums
export const inviteStatusSchema = z.nativeEnum(EInviteStatus);
export const inviteTypeSchema = z.nativeEnum(EInvitationType);
