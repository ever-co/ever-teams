import { useCallbackRef, useTeamTasks } from '@app/hooks';
import { detailedTaskState } from '@app/stores';
import { Button } from 'lib/components';
import Image from 'next/image';
import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { slateToHtml } from 'slate-serializers';
import { configSlateToHtml } from './editor-components/serializerConfigurations';
import { useTranslations } from 'next-intl';

interface IDFooterProps {
  isUpdated: boolean;
  setIsUpdated: () => void;
  editorValue?: any;
  editorRef: any;
  clearUnsavedValues: () => void;
}

const EditorFooter = ({
  isUpdated,
  setIsUpdated,
  editorValue,
  editorRef,
  clearUnsavedValues
}: IDFooterProps) => {
  const $setIsUpdated = useCallbackRef(setIsUpdated);
  const [task] = useAtom(detailedTaskState);
  const { updateDescription } = useTeamTasks();
  const t = useTranslations();
  const saveDescription = useCallback(
    (newDescription: string) => {
      updateDescription(newDescription, task, true);
    },
    [task, updateDescription]
  );

  const cancelEdit = () => {
    clearUnsavedValues();
    setTimeout(() => {
      setIsUpdated();
    }, 10);
  };

  useEffect(() => {
    const handleClickOutsideEditor = (event: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(event.target)) {
        $setIsUpdated.current();
      }
    };
    // Add event listener when component mounts
    document.addEventListener('mousedown', handleClickOutsideEditor);
    return () => {
      // Clean up event listener when component unmounts
      document.removeEventListener('mousedown', handleClickOutsideEditor);
    };
  }, [editorRef, $setIsUpdated]);

  return (
    <div>
      <div
        className={`flex justify-end mb-0 ${
          isUpdated ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Button
          variant="grey"
          onClick={cancelEdit}
          className=" dark:bg-gray-500 font-medium min-w-[5rem] w-[3rem] text-sm px-6 py-2 m-1 rounded-lg transition-all"
          disabled={!isUpdated}
        >
          {t('common.CANCEL')}
        </Button>
        <Button
          variant="primary"
          disabled={!isUpdated}
          onClick={() => {
            saveDescription(slateToHtml(editorValue, configSlateToHtml));
            setIsUpdated();
          }}
          className={
            'bg-primary min-w-[5rem] w-[3rem] text-sm text-white px-6 py-2 m-1 rounded-lg font-medium transition-all'
          }
        >
          {t('common.SAVE')}
        </Button>
      </div>

      <div className="max-h-[2.1875rem] flex justify-between items-center border-b-[0.0625rem] py-[0.5625rem] px-[0.9375rem] border-b-[#0000001A] dark:border-b-[#FFFFFF29]">
        <label className="text-xs dark:text-[#7B8089] text-gray-300">
          {t('pages.settingsTeam.ACCEPTANCE_CRITERIA')}
        </label>
        <Image
          src="/assets/svg/arrow-up.svg"
          alt="arrow"
          width={14}
          height={14}
          style={{ height: '14px' }}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
};

export default EditorFooter;
