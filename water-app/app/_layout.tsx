import { Stack } from "expo-router";
import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { useState, useEffect, createContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { handleNotificationResponse } from '@/utils/notifications';
import { addWaterFromNotification } from '@/utils/storage';

export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => { },
});

export default function RootLayout() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app-theme');
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme', error);
      }
    };

    loadTheme();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const result = await handleNotificationResponse(response);
      
      if (result) {
        await addWaterFromNotification(200);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await AsyncStorage.setItem('app-theme', nextTheme);
    } catch (error) {
      console.error('Failed to save theme', error);
    }
  };

  return (
    <>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <IconRegistry icons={EvaIconsPack} />
        <ApplicationProvider {...eva} theme={theme === 'light' ? eva.light : eva.dark}>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }} />
        </ApplicationProvider>
      </ThemeContext.Provider>
    </>
  );
}