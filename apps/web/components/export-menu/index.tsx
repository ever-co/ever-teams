'use client';

import { Menu, Transition } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { Fragment } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { useTranslations } from 'next-intl';

interface ExportMenuProps {
  pdfDocument: React.ReactElement<DocumentProps>;
  fileName: string;
  onCSVExport?: () => void;
  csvDisabled?: boolean;
  buttonClassName?: string;
}

export function ExportMenu({
  pdfDocument,
  fileName,
  onCSVExport,
  csvDisabled = true,
  buttonClassName = 'w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light'
}: ExportMenuProps) {
  const t = useTranslations();

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="w-full h-full items-center justify-between">
        <Button
          type="button"
          className={buttonClassName}
          variant="outline"
        >
          <span className="text-sm">Export</span> <ChevronDown size={15} />
        </Button>
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          static
          className="absolute z-[999] left-1/2 -translate-x-1/2 mt-2 w-[100px] origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-dark--theme-light shadow-lg ring-1 ring-black/5 focus:outline-none"
        >
          <div className="p-1 flex flex-col">
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`${active && 'bg-primary/10'} data-[state=checked]:text-blue-600 group flex w-full items-center px-2 py-2 text-sm`}
                >
                  <PDFDownloadLink
                    className="w-full h-full text-left"
                    document={pdfDocument}
                    fileName={fileName}
                  >
                    {({ loading }) =>
                      loading ? (
                        <p className="w-full h-full">{t('common.LOADING')}...</p>
                      ) : (
                        <p className="w-full h-full">PDF</p>
                      )
                    }
                  </PDFDownloadLink>
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onCSVExport}
                  disabled={csvDisabled}
                  className={`${active && 'bg-primary/10'} data-[state=checked]:text-blue-600 group flex w-full items-center px-2 py-2 text-sm ${csvDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>CSV</span>
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
