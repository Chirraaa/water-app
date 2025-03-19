// app/(tabs)/_layout.tsx
import React, { useContext } from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '@ui-kitten/components';
import { ThemeContext } from '../_layout';

export default function TabLayout() {
  const themeContext = useContext(ThemeContext);
  const isDarkMode = themeContext.theme === 'dark';
  
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarStyle: {
        backgroundColor: isDarkMode ? '#222B45' : '#FFFFFF',
      },
      tabBarActiveTintColor: isDarkMode ? '#3366FF' : '#3366FF',
      tabBarInactiveTintColor: isDarkMode ? '#8F9BB3' : '#8F9BB3',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home-outline" style={{ width: 24, height: 24 }} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color }) => <Icon name="bar-chart-outline" style={{ width: 24, height: 24 }} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Icon name="settings-outline" style={{ width: 24, height: 24 }} fill={color} />,
        }}
      />
    </Tabs>
  );
}