export const SettingPageTypeMessage = {
    loadSetting: 'load-setting',
    checkUpdate: 'check-for-update',
    updateAvailable: 'update-available',
    downloadingUpdate: 'downloading-update',
    downloaded: 'downloaded-update',
    installUpdate: 'install-update',
    saveSetting: 'save-setting',
    updateError: 'update-error'
}


export const DefaultRangeUpdateTimes = [
    {
      value: '30',
      label: `30_MINUTES`,
    },
    {
      value: '60',
      label: `A_HOURS`,
    },
    {
      value: '180',
      label: `3_HOURS`,
    },
    {
      value: '1140',
      label: `A_DAY`,
    },
  ]


export const CUSTOM_STYLE = {
  WINDOWS: {
    bgColor: 'bg-[#F2F2F2] dark:bg-[#1e2025]',
    rounded: 'rounded-lg',
    sideBar: '',
    sideServer: 'flex flex-col w-1/4 relative top-10 rounded-lg left-2  dark:bg-[#1e2025] bg-gray-200 rounded-3xl"',
    maxHeight: {
      maxHeight: '680px'
    },
    boxContent: 'py-5 px-5 content-start  rounded-lg dark:bg-[#25272D] dark:text-white bg-gray-50 shadow-sm'
  },
  MAC: {
    bgColor: 'bg-[#F2F2F2] dark:bg-[#1e2025]',
    rounded: 'rounded-3xl',
    sideBar: 'fixed top-0 left-0',
    sideServer: 'flex flex-col w-1/4 relative top-0 min-h-full dark:bg-[#2b2b2f] bg-gray-200 rounded-3xl',
    maxHeight: {

    },
    boxContent: 'py-5 px-5 content-start  rounded-3xl dark:bg-[#25272D] dark:text-white bg-gray-50 shadow-sm'
  }
}
