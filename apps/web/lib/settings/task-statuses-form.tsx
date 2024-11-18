/* eslint-disable no-mixed-spaces-and-tabs */
import { useModal, useRefetchData, useTaskStatus, useTeamTasks } from '@app/hooks';
import { IIcon, ITaskStatusItemList } from '@app/interfaces';
import { userState } from '@app/stores';
import { clsxm } from '@app/utils';
import { Spinner } from '@components/ui/loaders/spinner';
import { PlusIcon } from '@heroicons/react/20/solid';
import { Button, ColorPicker, InputField, Modal, Text } from 'lib/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useAtom } from 'jotai';
import { generateIconList } from './icon-items';
import IconPopover from './icon-popover';
import { StatusesListCard } from './list-card';
import SortTasksStatusSettings from '@components/pages/kanban/sort-tasks-status-settings';
import { StandardTaskStatusDropDown } from 'lib/features';
import { DeleteTaskStatusConfirmationModal } from '../features/task-status/delete-status-confirmation-modal';

type StatusForm = {
  formOnly?: boolean;
  onCreated?: () => void;
};

export const TaskStatusesForm = ({
  formOnly = false,
  onCreated
}: StatusForm) => {
  const [user] = useAtom(userState);
  const { register, setValue, handleSubmit, reset, getValues } = useForm();
  const [createNew, setCreateNew] = useState(formOnly);
  const [edit, setEdit] = useState<ITaskStatusItemList | null>(null);
  const t = useTranslations();
  const [selectedStatusType, setSelectedStatusType] = useState<string | null>(null);
  const [randomColor, setRandomColor] = useState<string | undefined>(undefined);

  const taskStatusIconList: IIcon[] = generateIconList('task-statuses', [
    'open',
    'in-progress',
    'ready',
    'in-review',
    'blocked',
    'completed',
	'backlog',
  ]);
  const taskSizesIconList: IIcon[] = generateIconList('task-sizes', [
    'x-large',
    'large',
    'medium',
    'small',
    'tiny',
  ]);
  const taskPrioritiesIconList: IIcon[] = generateIconList('task-priorities', [
    'urgent',
    'high',
    'medium',
    'low'
  ]);

  const iconList: IIcon[] = useMemo(() => [
    ...taskStatusIconList,
    ...taskSizesIconList,
    ...taskPrioritiesIconList
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ],[]) ;

  const {
    loading,
    taskStatus,
    createTaskStatus,
    deleteTaskStatus,
    editTaskStatus,
    createTaskStatusLoading,
    editTaskStatusLoading
  } = useTaskStatus();
  const { refetch } = useRefetchData();

  useEffect(() => {
    if (!edit && !getValues().name) {
      setValue('name', '');
      setValue('color', '');
      setValue('icon', '');
    }
  }, [taskStatus, edit, setValue, getValues]);

  useEffect(() => {
    if (edit) {
      setValue('name', edit.name?.split('-').join(' '));
      setValue('color', edit.color);
      setValue('icon', edit.icon);
    } else {
      setValue('name', '');
      setValue('color', '');
      setValue('icon', '');
    }
  }, [
    edit,
    setValue,
    createTaskStatus,
    editTaskStatus,
    user?.employee?.organizationId,
    user?.tenantId
  ]);

  const onSubmit = useCallback(
    async (values: any) => {
      if (createNew) {
        createTaskStatus({
          name: values.name,
          value: values.name.split(' ').join('-').toLowerCase(),
          color: values.color,
          // description: '',
          organizationId: user?.employee?.organizationId,
          tenantId: user?.tenantId ?? '',
          icon: values.icon,
          template: values.template
          // projectId: '',
        })?.then(() => {
          !formOnly && setCreateNew(false);

          onCreated && onCreated();
          refetch();
          reset();
        });
      }
      if (
        edit &&
        (values.name !== edit.name?.split('-').join(' ') ||
          values.color !== edit.color ||
          values.icon !== edit.icon)
      ) {
        editTaskStatus(edit.id, {
          name: values.name,
          color: values.color,
          icon: values.icon
        })?.then(() => {
          setEdit(null);
          refetch();
        });
      }
    },
    [
      edit,
      createNew,
      formOnly,
      editTaskStatus,
      onCreated,
      user,
      reset,
      createTaskStatus,
      refetch
    ]
  );
  const updateArray = taskStatus.slice();
  const sortedArray =
    Array.isArray(updateArray) && updateArray.length > 0
      ? updateArray.sort((a: any, b: any) => a.order - b.order)
      : [];
  const { isOpen, closeModal, openModal } = useModal();
  const {isOpen : isDeleteConfirmationOpen , closeModal : closeDeleteConfirmationModal, openModal : openDeleteConfirmationModal} = useModal()
  const [statusToDelete, setStatusToDelete] = useState<ITaskStatusItemList | null>(null)
  const {tasks} = useTeamTasks()

  /**
   * Get Icon by status name
   *
   * @param {string} iconName - Name of the icon
   * @returns {IIcon} - Icon of the status
   */
  const getIcon = useCallback(
		(iconName: string | null) => {
			if (!iconName) return null;

			const STATUS_MAPPINGS: Record<string, string> = {
				'ready-for-review': 'ready'
			};

			const name = STATUS_MAPPINGS[iconName] || iconName;

			const icon = iconList.find((icon) => icon.title === name);
			
			if (icon) {
				setValue('icon', icon.path);
			}
			return icon;
		},
		[iconList, setValue]
  );


  /**
   * Get random color for new status
   *
   * @returns {string} - Random color
   */
  const getRandomColor = useCallback(() => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }, []);

  useEffect(() => {
	if (!edit && selectedStatusType) {
	  setRandomColor(getRandomColor());
	}
  }, [selectedStatusType, edit, getRandomColor]);

  return (
    <>
      <Modal isOpen={isOpen} closeModal={closeModal}>
        <SortTasksStatusSettings onClose={closeModal} arr={sortedArray} />
      </Modal>
      <form
        className="w-full"
        onSubmit={handleSubmit(onSubmit)}
        autoComplete="off"
      >
        <div className="flex">
          <div className="rounded-md m-h-64 p-[32px] pl-0 pr-0 flex gap-x-[2rem] flex-col sm:flex-row items-center sm:items-start">
            {!formOnly && (
              <Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-[200px] text-center sm:text-left">
                {t('pages.settingsTeam.TASK_STATUSES')}
              </Text>
            )}

            <div className="flex flex-col gap-2  items-center sm:items-start">
              <div className="flex gap-2">
                {!createNew && !edit && (
                  <Button
                    variant="outline"
                    className="font-normal justify-center border-2 rounded-[10px] text-md w-[230px] gap-2 h-[46px]"
                    onClick={() => {
                      setEdit(null);
                      setCreateNew(true);
                    }}
                  >
                    <PlusIcon className=" font-normal w-[16px] h-[16px]" />
                    {t('pages.settingsTeam.CREATE_NEW_STATUS')}
                  </Button>
                )}
                <Button
                  onClick={openModal}
                  variant="outline"
                  className="rounded-[10px]"
                >
                  {t('common.SORT')}
                </Button>
              </div>
              {(createNew || edit) && (
                <>
                  <Text className="flex-none flex-grow-0 mb-2 text-lg font-normal text-gray-400">
                    {createNew && t('common.NEW')}
                    {edit && t('common.EDIT')} {t('common.STATUSES')}
                  </Text>
                  <div
                    className={clsxm(
                      'flex w-full gap-x-5 items-center mt-3',
                      formOnly && ['flex-wrap space-y-2']
                    )}
                  >
                    <InputField
                      type="text"
                      placeholder={t('pages.settingsTeam.CREATE_NEW_STATUS')}
                      className="mb-0 w-full"
                      wrapperClassName="mb-0 rounded-lg flex-grow"
                      {...register('name')}
                    />
                    <StandardTaskStatusDropDown
                      onValueChange={(status) => {
						setValue('template', status)
						setSelectedStatusType(status)
					  } }
                      className="h-14 shrink-0"
					  defaultValue={edit?.value}
                    />
                    <IconPopover
                      iconList={iconList}
                      setValue={setValue}
                      active={
						selectedStatusType ? getIcon(selectedStatusType)
                          : edit
                          ? (iconList.find(
                              (icon) => icon.path === edit.icon
                            ) as IIcon) : null
                      }
                    />
                    <ColorPicker
                      defaultColor={edit ? edit.color : randomColor}
                      onChange={(color) => setValue('color', color)}
                      className=" shrink-0"
                    />
                  </div>
                  <div className="flex mt-5 gap-x-4">
                    <Button
                      variant="primary"
                      className="px-4 py-4 font-normal rounded-xl text-md"
                      type="submit"
                      disabled={
                        createTaskStatusLoading || editTaskStatusLoading
                      }
                      loading={createTaskStatusLoading || editTaskStatusLoading}
					  onClick={() => {
						setSelectedStatusType(null);
					  }}
                    >
                      {edit ? t('common.SAVE') : t('common.CREATE')}
                    </Button>
                    {!formOnly && (
                      <Button
                        variant="grey"
                        className="px-4 py-4 font-normal rounded-xl text-md"
                        onClick={() => {
                          setCreateNew(false);
                          setEdit(null);
						  setSelectedStatusType(null);
                        }}
                      >
                        {t('common.CANCEL')}
                      </Button>
                    )}
                  </div>
                </>
              )}

              {!formOnly && taskStatus.length > 0 && (
                <>
                  <Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-[1rem] w-full mt-[2.4rem] text-center sm:text-left">
                    {t('pages.settingsTeam.LIST_OF_STATUSES')}
                  </Text>
                  <div className="flex flex-wrap justify-center w-full gap-3 sm:justify-start">
                    {loading && <Spinner dark={false} />}
                    {!loading && sortedArray.length ? (
                      sortedArray.map((status) => (
                        <StatusesListCard
                          key={status.id}
                          statusTitle={
                            status.name ? status.name?.split('-').join(' ') : ''
                          }
                          bgColor={status.color || ''}
                          statusIcon={status.fullIconUrl || ''}
                          onEdit={() => {
                            setCreateNew(false);
                            setEdit(status);
                          }}
                          onDelete={async () => {
							try {
								const isStatusUsed = tasks.find(
									(t) => t.status?.toLowerCase() === status.name?.toLowerCase()
								);
								if (isStatusUsed) {
									setStatusToDelete(status);
									openDeleteConfirmationModal();
								} else {
									await deleteTaskStatus(status.id);
								}
							} catch (error) {
								console.error(error);
							}
                          }}
                          isStatus={true}
                        />
                      ))
                    ) : (
                      <></>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </form>
	  {statusToDelete && <DeleteTaskStatusConfirmationModal onCancel={() => setStatusToDelete(null)} status={statusToDelete} open={isDeleteConfirmationOpen} closeModal={closeDeleteConfirmationModal}/>}
    </>
  );
};
