// app/(tabs)/index.tsx
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Warning: MeasureElement: Support for defaultProps']);
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, Alert, AppState, AppStateStatus } from 'react-native';
import {
  Layout,
  Text,
  Card,
  Button,
  ProgressBar,
  Icon,
  IconProps,
  Spinner,
  useTheme
} from '@ui-kitten/components';
import { getWaterData, saveWaterData, getSettings, getUserProfile, WaterData, getTodayDateString, addWaterFromNotification, updateGamification } from '@/utils/storage';
import { scheduleNotifications, createNotificationListener, removeNotificationListener } from '@/utils/notifications';
import * as Notifications from 'expo-notifications';
import { NotificationConfirmation } from '@/components/NotificationConfirmation';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const WaterIcon = (props: IconProps) => (
  <Icon {...props} name='droplet-outline' />
);

const PlusIcon = (props: IconProps) => (
  <Icon {...props} name='plus-outline' />
);

export default function HomeScreen() {
  const theme = useTheme();
  const appState = useRef(AppState.currentState);

  const [loading, setLoading] = useState(true);
  const [waterIntake, setWaterIntake] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [todayData, setTodayData] = useState<WaterData | null>(null);
  const [nextReminderTime, setNextReminderTime] = useState<string | null>(null);
  const [nextReminderISO, setNextReminderISO] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  const [level, setLevel] = useState(1);
  const [xp, setXP] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);


  // State for notification confirmation modal
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [notificationAmount, setNotificationAmount] = useState(200);

  useEffect(() => {
    loadData();

    // Set up notification listener
    const notificationListener = createNotificationListener((notification) => {
      // Show confirmation modal when notification is received
      if (notification.request.content.data?.type === 'water_reminder') {
        setNotificationAmount(200); // Default amount
        setConfirmationVisible(true);
      }
    });

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      removeNotificationListener(notificationListener);
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      loadData();
    }
    appState.current = nextAppState;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const today = getTodayDateString();
      const userProfile = await getUserProfile();
      if (userProfile) {
        setUserName(userProfile.name || '');
        setLevel(userProfile.level);
        setXP(userProfile.xp);
        setCurrentStreak(userProfile.currentStreak);
        setHighestStreak(userProfile.highestStreak);
      }

      // Load settings to get daily goal
      const settings = await getSettings();
      if (settings) {
        setDailyGoal(settings.dailyGoal);
      }

      // Load today's water data
      const data = await getWaterData(today);
      if (data) {
        setWaterIntake(data.intake);
        setTodayData(data);
      } else {
        // Initialize today's data
        const newData: WaterData = {
          date: today,
          intake: 0,
          goal: settings?.dailyGoal || 2000
        };
        setTodayData(newData);
        await saveWaterData(newData);
      }

      // Calculate next reminder time
      calculateNextReminder(settings?.reminderFrequency, settings?.startTime, settings?.endTime);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load your water data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to calculate the next reminder time
  const calculateNextReminder = (frequency?: string, startTime?: string, endTime?: string) => {
    if (!frequency || !startTime || !endTime) {
      setNextReminderTime(null);
      setNextReminderISO(null);
      return;
    }

    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      // Check if current time is within the active hours
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      if (currentTimeInMinutes < startTimeInMinutes) {
        // If before start time, next reminder is at start time
        setNextReminderTime(startTime);

        const nextReminder = new Date();
        nextReminder.setHours(startHour, startMinute, 0, 0);
        setNextReminderISO(nextReminder.toISOString());
        return;
      }

      if (currentTimeInMinutes > endTimeInMinutes) {
        // If after end time, next reminder is tomorrow at start time
        setNextReminderTime(`${startTime} (tomorrow)`);

        const nextReminder = new Date();
        nextReminder.setDate(nextReminder.getDate() + 1);
        nextReminder.setHours(startHour, startMinute, 0, 0);
        setNextReminderISO(nextReminder.toISOString());
        return;
      }

      // If within active hours, calculate next reminder based on frequency
      const frequencyMin = parseInt(frequency);
      if (isNaN(frequencyMin)) {
        setNextReminderTime(null);
        setNextReminderISO(null);
        return;
      }

      // Calculate minutes until next reminder
      const minutesSinceStart = currentTimeInMinutes - startTimeInMinutes;
      const remindersSoFar = Math.floor(minutesSinceStart / frequencyMin);
      const nextReminderMinutes = startTimeInMinutes + (remindersSoFar + 1) * frequencyMin;

      if (nextReminderMinutes > endTimeInMinutes) {
        // If next reminder would be after end time, next reminder is tomorrow
        setNextReminderTime(`${startTime} (tomorrow)`);

        const nextReminder = new Date();
        nextReminder.setDate(nextReminder.getDate() + 1);
        nextReminder.setHours(startHour, startMinute, 0, 0);
        setNextReminderISO(nextReminder.toISOString());
        return;
      }

      // Format the next reminder time
      const nextHour = Math.floor(nextReminderMinutes / 60);
      const nextMinute = nextReminderMinutes % 60;
      const nextTimeStr = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;

      // Calculate time remaining
      const minutesRemaining = nextReminderMinutes - currentTimeInMinutes;
      let timeRemainingStr;
      if (minutesRemaining < 60) {
        timeRemainingStr = `In ${minutesRemaining} minutes`;
      } else {
        const hoursRemaining = Math.floor(minutesRemaining / 60);
        const minsRemaining = minutesRemaining % 60;
        timeRemainingStr = `In ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}${minsRemaining > 0 ? ` ${minsRemaining} min` : ''}`;
      }

      setNextReminderTime(`${nextTimeStr} (${timeRemainingStr})`);

      const nextReminder = new Date();
      nextReminder.setHours(nextHour, nextMinute, 0, 0);
      setNextReminderISO(nextReminder.toISOString());
    } catch (error) {
      console.error('Error calculating next reminder:', error);
      setNextReminderTime(null);
      setNextReminderISO(null);
    }
  };

  // Function to add water
  const addWater = async (amount: number) => {
    try {
      const newIntake = Math.min(waterIntake + amount, dailyGoal);
      setWaterIntake(newIntake);

      if (todayData) {
        const updatedData: WaterData = { ...todayData, intake: newIntake };
        setTodayData(updatedData);
        await saveWaterData(updatedData);
        await updateGamification(newIntake, dailyGoal); // Update XP and level
        const updatedProfile = await getUserProfile();
        if (updatedProfile) {
          setLevel(updatedProfile.level);
          setXP(updatedProfile.xp);
          setCurrentStreak(updatedProfile.currentStreak);
          setHighestStreak(updatedProfile.highestStreak);
          const settings = await getSettings();
          if (settings) setDailyGoal(settings.dailyGoal); // Reflect new goal
        }
      }
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const getRankTitle = (lvl: number) => {
    if (lvl >= 20) return "Aqua Legend";
    if (lvl >= 15) return "Hydration Master";
    if (lvl >= 10) return "Water Warrior";
    if (lvl >= 5) return "Hydro Hero";
    return "Water Novice";
  };

  // Handler for notification confirmation
  const handleConfirmNotification = async () => {
    await addWater(notificationAmount);
    setConfirmationVisible(false);
  };

  // Handler for notification dismiss
  const handleDismissNotification = () => {
    setConfirmationVisible(false);
    // Schedule a reminder for 15 minutes later
    scheduleDelayedReminder();
  };

  // Function to schedule a delayed reminder
  const scheduleDelayedReminder = async () => {
    try {
      const reminderTime = new Date();
      reminderTime.setMinutes(reminderTime.getMinutes() + 15);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder: Drink Water! 💧',
          body: 'You asked us to remind you again. Time to hydrate!',
          sound: true,
          data: {
            type: 'water_reminder',
            time: reminderTime.toISOString()
          },
          categoryIdentifier: 'water_reminder',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
        },
      });
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size='large' />
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text category='h1' style={styles.title}>
          {userName ? `${userName}'s Water Tracker` : 'Water Reminder'}
        </Text>

        {/* Gamification Card */}
        <Card style={styles.card}>
          <Text category='h6'>Your Journey</Text>
          <Text category='s1'>Rank: {getRankTitle(level)}</Text>
          <Text>Level: {level}</Text>
          <Text>XP: {xp} / {(level) * 500}</Text>
          <ProgressBar
            style={styles.progressBar}
            progress={(xp % 500) / 500}
          />
          <Text>Current Streak: {currentStreak} days</Text>
          <Text>Highest Streak: {highestStreak} days</Text>
        </Card>

        {/* Progress Card */}
        <Card style={styles.card}>
          <Text category='h6'>Today's Progress</Text>
          <View style={styles.progressSection}>
            <WaterIcon style={styles.waterIcon} fill={theme['color-primary-500']} />
            <Text category='h1'>{waterIntake}ml</Text>
            <Text appearance='hint'>of {dailyGoal}ml</Text>
          </View>
          <ProgressBar
            style={styles.progressBar}
            progress={waterIntake / dailyGoal}
          />
        </Card>

        {/* Quick Add Card */}
        <Card style={styles.card}>
          <Text category='h6'>Quick Add</Text>
          <View style={styles.buttonGroup}>
            <Button
              style={styles.addButton}
              onPress={() => addWater(100)}
              accessoryLeft={PlusIcon}
            >
              100ml
            </Button>
            <Button
              style={styles.addButton}
              onPress={() => addWater(200)}
              accessoryLeft={PlusIcon}
            >
              200ml
            </Button>
            <Button
              style={styles.addButton}
              onPress={() => addWater(300)}
              accessoryLeft={PlusIcon}
            >
              300ml
            </Button>
          </View>
        </Card>

        {/* Next Reminder Card */}
        <Card style={styles.card}>
          <Text category='h6'>Next Reminder</Text>
          {nextReminderTime ? (
            <>
              <Text category='s1'>{nextReminderTime.split(' (')[0]}</Text>
              <Text appearance='hint'>{nextReminderTime.includes('(') ? nextReminderTime.split('(')[1].replace(')', '') : ''}</Text>
            </>
          ) : (
            <Text appearance='hint'>Enable notifications in settings</Text>
          )}
        </Card>
      </ScrollView>

      {/* Notification Confirmation Modal */}
      <NotificationConfirmation
        visible={confirmationVisible}
        onClose={handleDismissNotification}
        onConfirm={handleConfirmNotification}
        amount={notificationAmount}
      />
    </Layout>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginVertical: 16,
  },
  card: {
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  progressSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  waterIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  progressBar: {
    marginTop: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  addButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});