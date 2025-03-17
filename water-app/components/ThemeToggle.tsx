// components/ThemeToggle.tsx
import React, { useContext } from 'react';
import { TouchableOpacity } from 'react-native';
import { Icon, IconProps, useTheme } from '@ui-kitten/components';
import { ThemeContext } from '../app/_layout';

const MoonIcon = (props: IconProps) => (
  <Icon {...props} name='moon-outline' />
);

const SunIcon = (props: IconProps) => (
  <Icon {...props} name='sun-outline' />
);

interface ThemeToggleProps {
  size?: number;
}

export const ThemeToggle = ({ size = 24 }: ThemeToggleProps) => {
  const themeContext = useContext(ThemeContext);
  const theme = useTheme();
  
  return (
    <TouchableOpacity onPress={themeContext.toggleTheme}>
      {themeContext.theme === 'light' ? (
        <MoonIcon width={size} height={size} fill={theme['text-basic-color']} />
      ) : (
        <SunIcon width={size} height={size} fill={theme['text-basic-color']} />
      )}
    </TouchableOpacity>
  );
};