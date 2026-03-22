import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

export const useThemeColors = () => {
  const { activeTheme } = useTheme();
  return Colors[activeTheme];
};
