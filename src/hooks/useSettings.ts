import { useContext } from 'react';
import { SettingsContext } from '@/context/SettingsContext';

export const useSettings = () => {
  const context = useContext(SettingsContext as any);
  if (!context) {
    return {
      settings: null,
      loading: true,
      updateSetting: async () => {},
    };
  }
  return context;
};

export default useSettings;
