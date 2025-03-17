import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import {
  Layout,
  Text,
  Card,
  Toggle,
  Input,
  Button,
  Select,
  SelectItem,
  IndexPath,
  Spinner,
  Icon,
  IconProps
} from '@ui-kitten/components';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getSettings, saveSettings, getUserProfile, saveUserProfile, calculateRecommendedIntake } from '@/utils/storage';
import { scheduleNotifications, cancelAllNotifications } from '@/utils/notifications';
import { ThemeContext } from '../_layout';
import { ThemeToggle } from '@/components/ThemeToggle';

const ClockIcon = (props: IconProps) => (
  <Icon {...props} name='clock-outline' />
);

export default function SettingsScreen() {
  // Theme settings
  const themeContext = useContext(ThemeContext);

  // User profile settings
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<IndexPath | undefined>();
  const [userName, setUserName] = useState('');

  // Water and notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyGoal, setDailyGoal] = useState('2000');
  const [reminderFrequency, setReminderFrequency] = useState('60');
  const [startTime, setStartTime] = useState('8:00');
  const [endTime, setEndTime] = useState('22:00');

  // Time picker state
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startTimeDate, setStartTimeDate] = useState(new Date());
  const [endTimeDate, setEndTimeDate] = useState(new Date());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  const activityOptions = [
    'Sedentary (little or no exercise)',
    'Lightly active (light exercise 1-3 days/week)',
    'Moderately active (moderate exercise 3-5 days/week)',
    'Very active (hard exercise 6-7 days/week)',
    'Extra active (very hard exercise & physical job)'
  ];

  useEffect(() => {
    loadAllSettings();
  }, []);

  // Convert time string to Date object
  const timeStringToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  };

  // Convert Date object to time string
  const dateToTimeString = (date: Date): string => {
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const loadAllSettings = async () => {
    try {
      // Load user profile
      const profile = await getUserProfile();
      if (profile) {
        setWeight(profile.weight.toString());
        setActivityLevel(profile.activityLevel);
        setUserName(profile.name || '');

        // Find the corresponding index for the activity level
        const activityIndex = activityOptions.findIndex(option => option === profile.activityLevel);
        if (activityIndex !== -1) {
          setSelectedActivityIndex(new IndexPath(activityIndex));
        }
      }

      // Load app settings
      const settings = await getSettings();
      if (settings) {
        setNotificationsEnabled(settings.notificationsEnabled);
        setDailyGoal(settings.dailyGoal.toString());
        setReminderFrequency(settings.reminderFrequency || '60');
        setStartTime(settings.startTime || '8:00');
        setEndTime(settings.endTime || '22:00');

        // Set time picker dates
        setStartTimeDate(timeStringToDate(settings.startTime || '8:00'));
        setEndTimeDate(timeStringToDate(settings.endTime || '22:00'));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load your settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onStartTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startTimeDate;
    setShowStartTimePicker(Platform.OS === 'ios');
    setStartTimeDate(currentDate);
    setStartTime(dateToTimeString(currentDate));
  };

  const onEndTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || endTimeDate;
    setShowEndTimePicker(Platform.OS === 'ios');
    setEndTimeDate(currentDate);
    setEndTime(dateToTimeString(currentDate));
  };

  const handleSave = async () => {
    // Validate inputs
    if (!weight || !activityLevel) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    try {
      setSaving(true);

      // Calculate recommended intake based on current values
      const recommendedIntake = calculateRecommendedIntake(weightNum, activityLevel);

      // Update user profile
      await saveUserProfile({
        name: userName,
        weight: weightNum,
        activityLevel,
        recommendedIntake
      });
      // Ask if user wants to update daily goal to recommended value
      let goalValue = parseInt(dailyGoal);
      if (isNaN(goalValue) || goalValue <= 0) {
        goalValue = recommendedIntake; // Use recommended as fallback
      }

      const useRecommended = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Update Water Goal',
          `Based on your profile, we recommend ${recommendedIntake}ml of water daily. Would you like to update your goal?`,
          [
            {
              text: 'Keep Current',
              onPress: () => resolve(false),
              style: 'cancel',
            },
            {
              text: 'Use Recommended',
              onPress: () => resolve(true),
            },
          ]
        );
      });

      if (useRecommended) {
        goalValue = recommendedIntake;
        setDailyGoal(goalValue.toString());
      }

      // Save all app settings
      const settingsToSave = {
        dailyGoal: goalValue,
        notificationsEnabled,
        reminderFrequency,
        startTime,
        endTime
      };

      await saveSettings(settingsToSave);

      // Handle notifications based on user preference
      if (notificationsEnabled) {
        try {
          await scheduleNotifications(settingsToSave);
        } catch (error) {
          console.error('Failed to schedule notifications:', error);
          Alert.alert('Warning', 'Settings saved but notification scheduling failed.');
        }
      } else {
        try {
          await cancelAllNotifications();
        } catch (error) {
          console.error('Failed to cancel notifications:', error);
        }
      }

      Alert.alert('Success', 'Your settings have been saved.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save your settings. Please try again.');
    } finally {
      setSaving(false);
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
        <Text category='h1' style={styles.title}>Settings</Text>

        {/* Theme Settings */}
        <Card style={styles.card}>
          <Text category='h6'>Appearance</Text>
          <View style={styles.settingRow}>
            <Text>Dark Mode</Text>
            <ThemeToggle />
          </View>
          <Text appearance='hint' style={styles.hint}>
            Current theme: {themeContext.theme === 'light' ? 'Light' : 'Dark'}
          </Text>
        </Card>

        {/* Profile Settings */}
        <Card style={styles.card}>
          <Text category='h6'>Profile Information</Text>
          <Input
            label='Name'
            value={userName}
            onChangeText={setUserName}
            style={styles.input}
          />
          <Input
            label='Weight (kg)'
            value={weight}
            onChangeText={setWeight}
            keyboardType='number-pad'
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Activity Level</Text>
          <Select
            style={styles.select}
            placeholder='Select your activity level'
            selectedIndex={selectedActivityIndex}
            onSelect={index => {
              setSelectedActivityIndex(index as IndexPath);
              setActivityLevel(activityOptions[(index as IndexPath).row]);
            }}
            value={activityLevel}
          >
            {activityOptions.map((option, index) => (
              <SelectItem key={index} title={option} />
            ))}
          </Select>
        </Card>

        {/* Water Goal Settings */}
        <Card style={styles.card}>
          <Text category='h6'>Water Goal</Text>
          <Input
            label='Daily Goal (ml)'
            value={dailyGoal}
            onChangeText={setDailyGoal}
            keyboardType='number-pad'
            style={styles.input}
          />
        </Card>

        {/* Notification Settings */}
        <Card style={styles.card}>
          <Text category='h6'>Notifications</Text>
          <View style={styles.settingRow}>
            <Text>Enable Reminders</Text>
            <Toggle
              checked={notificationsEnabled}
              onChange={setNotificationsEnabled}
            />
          </View>

          {notificationsEnabled && (
            <>
              <Input
                label='Reminder Frequency (minutes)'
                value={reminderFrequency}
                onChangeText={setReminderFrequency}
                keyboardType='number-pad'
                style={styles.input}
              />

              {/* Start Time Picker */}
              <Text style={styles.inputLabel}>Start Time</Text>
              <Button
                appearance="outline"
                accessoryLeft={ClockIcon}
                onPress={() => setShowStartTimePicker(true)}
                style={styles.timeButton}
              >
                {startTime}
              </Button>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTimeDate}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onStartTimeChange}
                />
              )}

              {/* End Time Picker */}
              <Text style={styles.inputLabel}>End Time</Text>
              <Button
                appearance="outline"
                accessoryLeft={ClockIcon}
                onPress={() => setShowEndTimePicker(true)}
                style={styles.timeButton}
              >
                {endTime}
              </Button>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTimeDate}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={onEndTimeChange}
                />
              )}
            </>
          )}
        </Card>

        <Button
          onPress={handleSave}
          style={styles.saveButton}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </ScrollView>
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  input: {
    marginTop: 8,
  },
  inputLabel: {
    marginTop: 16,
    marginBottom: 4,
  },
  select: {
    marginTop: 4,
  },
  saveButton: {
    marginVertical: 16,
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
  },
  timeButton: {
    marginTop: 4,
  }
});