import { useEffect, useState } from 'react';
import AdvancedSetting from './setup/AdvancedSetting';
import Landing from './setup/Landing';
import CheckIcon from '../components/svgs/CheckIcon';
import WindowControl from '../components/window-control';
import { WindowTypes } from '../../main/helpers/constant';
const SetupPage = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [platform, setPlatform] = useState('win');

  const letsGo = () => {
    setCurrentStep(2);
  };

  const goBack = () => {
    setCurrentStep(1);
  };

  const getPlatform = async () => {
    const devicePlatform = await window.electron.ipcRenderer.invoke('get-platform');
    setPlatform(devicePlatform);
  }

  useEffect(() => {
    getPlatform();
  })

  return (
    <>
      {platform === 'darwin' && (
        <WindowControl windowTypes={WindowTypes.SETUP_WINDOW} />
      )}
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-white px-4">
        <div className="flex w-full justify-center mb-8 mt-8">
          <div className="flex items-center">
            <div
              className={`w-10 h-10 flex justify-center items-center rounded-full ${currentStep === 1 ? 'bg-purple-600' : 'bg-purple-600'}`}
            >
              {currentStep === 1 ? 1 : <CheckIcon />}
            </div>
            <div className="h-1 w-96 bg-purple-600"></div>
            <div className="w-10 h-10 flex justify-center items-center rounded-full bg-purple-600">
              <span>2</span>
            </div>
          </div>
        </div>
        {currentStep === 1 ? (
          <Landing nextAction={letsGo} />
        ) : (
            <AdvancedSetting back={goBack} />
          )}
      </div>
    </>
  );
};

export default SetupPage;
