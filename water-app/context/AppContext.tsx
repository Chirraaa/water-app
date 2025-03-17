import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from 'expo-notifications';

interface UserInfo {
  weight: number;
  age: number;
  activityLevel: 'low' | 'moderate' | 'high';
  gender: 'male' | 'female' | 'other';
  wakeTime: string;
  sleepTime: string;
}

interface Reminder {
  id: string;
  time: string;
  amount: number;
  enabled: boolean;
}

interface AppContextProps {
  userInfo: UserInfo | null;
  isOnboarded: boolean;
  dailyGoal: number;
  currentIntake: number;
  reminders: Reminder[];
  updateUserInfo: (info: UserInfo) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  addWater: (amount: number) => Promise<void>;
  resetWaterForToday: () => Promise<void>;
  updateReminders: (reminders: Reminder[]) => Promise<void>;
  setReminderEnabled: (id: string, enabled: boolean) => Promise<void>;
  addReminder: (time: string, amount: number) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
}

const defaultUserInfo: UserInfo = {
  weight: 70,
  age: 30,
  activityLevel: 'moderate',
  gender: 'other',
  wakeTime: '08:00',
  sleepTime: '22:00',
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(2000); // ml
  const [currentIntake, setCurrentIntake] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved data
  useEffect(() => {
    const loadData = async () => {
      try {
        const onboardingStatus = await AsyncStorage.getItem('isOnboarded');
        const savedUserInfo = await AsyncStorage.getItem('userInfo');
        const savedIntake = await AsyncStorage.getItem('currentIntake');
        const savedGoal = await AsyncStorage.getItem('dailyGoal');
        const savedReminders = await AsyncStorage.getItem('reminders');
        const lastResetDate = await AsyncStorage.getItem('lastResetDate');

        // Check if we need to reset water intake for a new day
        const today = new Date().toDateString();
        if (lastResetDate !== today) {
          await AsyncStorage.setItem('currentIntake', '0');
          await AsyncStorage.setItem('lastResetDate', today);
          setCurrentIntake(0);
        } else if (savedIntake) {
          setCurrentIntake(parseInt(savedIntake, 10));
        }

        if (onboardingStatus === 'true') {
          setIsOnboarded(true);
        }

        if (savedUserInfo) {
          const parsedUserInfo = JSON.parse(savedUserInfo);
          setUserInfo(parsedUserInfo);
          
          // Calculate daily goal based on user info if not set
          if (!savedGoal) {
            const calculatedGoal = calculateWaterIntake(parsedUserInfo);
            setDailyGoal(calculatedGoal);
            await AsyncStorage.setItem('dailyGoal', calculatedGoal.toString());
          } else {
            setDailyGoal(parseInt(savedGoal, 10));
          }
        }

        if (savedReminders) {
          setReminders(JSON.parse(savedReminders));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate water intake based on user info
  const calculateWaterIntake = (info: UserInfo): number => {
    // Base calculation: 30ml per kg of body weight
    let baseIntake = info.weight * 30;
    
    // Adjust for activity level
    switch (info.activityLevel) {
      case 'low':
        baseIntake *= 1;
        break;
      case 'moderate':
        baseIntake *= 1.1;
        break;
      case 'high':
        baseIntake *= 1.2;
        break;
    }
    
    // Adjust for age (older people may need to drink more water)
    if (info.age > 55) {
      baseIntake *= 1.05;
    }

    // Round to nearest 50ml
    return Math.round(baseIntake / 50) * 50;
  };

  const updateUserInfo = async (info: UserInfo) => {
    try {
      await AsyncStorage.setItem('userInfo', JSON.stringify(info));
      setUserInfo(info);
      
      // Update daily goal based on new user info
      const newGoal = calculateWaterIntake(info);
      setDailyGoal(newGoal);
      await AsyncStorage.setItem('dailyGoal', newGoal.toString());
    } catch (error) {
      console.error('Error saving user info:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('isOnboarded', 'true');
      setIsOnboarded(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const addWater = async (amount: number) => {
    try {
      const newIntake = currentIntake + amount;
      setCurrentIntake(newIntake);
      await AsyncStorage.setItem('currentIntake', newIntake.toString());
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const resetWaterForToday = async () => {
    try {
      setCurrentIntake(0);
      await AsyncStorage.setItem('currentIntake', '0');
      await AsyncStorage.setItem('lastResetDate', new Date().toDateString());
    } catch (error) {
      console.error('Error resetting water:', error);
    }
  };

  const updateReminders = async (newReminders: Reminder[]) => {
    try {
      setReminders(newReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(newReminders));
    } catch (error) {
      console.error('Error updating reminders:', error);
    }
  };

  const setReminderEnabled = async (id: string, enabled: boolean) => {
    try {
      const updatedReminders = reminders.map(reminder => 
        reminder.id === id ? { ...reminder, enabled } : reminder
      );
      setReminders(updatedReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Error setting reminder status:', error);
    }
  };

  const addReminder = async (time: string, amount: number) => {
    try {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        time,
        amount,
        enabled: true,
      };
      const updatedReminders = [...reminders, newReminder];
      setReminders(updatedReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  const removeReminder = async (id: string) => {
    try {
      const updatedReminders = reminders.filter(reminder => reminder.id !== id);
      setReminders(updatedReminders);
      await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Error removing reminder:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <AppContext.Provider
      value={{
        userInfo,
        isOnboarded,
        dailyGoal,
        currentIntake,
        reminders,
        updateUserInfo,
        completeOnboarding,
        addWater,
        resetWaterForToday,
        updateReminders,
        setReminderEnabled,
        addReminder,
        removeReminder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};