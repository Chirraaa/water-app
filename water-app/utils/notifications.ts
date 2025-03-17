// utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { AppSettings, getUserProfile } from './storage';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Sample funny reminder messages
const reminderMessages = [
    "Hey {name}, your body is 60% water, not coffee! Drink up! 💧",
    "{name}, even cacti need water. And you're not a cactus! 🌵",
    "Earth to {name}! Your cells are thirsty, don't ignore them! 💦",
    "Hydration alert! {name}, your water bottle is feeling neglected. 😢",
    "Doctor {name}, did you forget to prescribe yourself some H2O? 🩺",
    "{name}, think of your water bottle as your trusty sidekick. Don't leave it hanging! 🦸‍♂️",
    "Attention {name}! Your kidneys are sending an SOS. Water needed ASAP! 🚨",
    "Hey {name}, being awesome burns calories, and that requires water! 💪",
    "{name}, your plants get water regularly. Shouldn't you? 🌱",
    "Water you waiting for, {name}? Time to hydrate! 💧"
];

// Request permission for notifications
export async function requestNotificationPermissions() {
    if (!Device.isDevice) {
        console.log('Must use physical device for notifications');
        return false;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('water-reminders', {
            name: 'Water Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3366FF',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

// Get a random reminder message
async function getRandomReminderMessage(): Promise<string> {
    try {
        const userProfile = await getUserProfile();
        const name = userProfile?.name || "Buddy";
        
        const randomIndex = Math.floor(Math.random() * reminderMessages.length);
        return reminderMessages[randomIndex].replace('{name}', name);
    } catch (error) {
        console.error('Error getting reminder message:', error);
        return 'Time to drink water! 💧';
    }
}

// Schedule notifications based on settings
export async function scheduleNotifications(settings: AppSettings) {
    try {
        // First, cancel all existing notifications
        await cancelAllNotifications();

        // If notifications are disabled, exit
        if (!settings.notificationsEnabled) {
            return;
        }

        // Ensure we have permission
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.log('Permission not granted for notifications');
            return;
        }

        // Parse time values
        const [startHour, startMinute] = settings.startTime.split(':').map(Number);
        const [endHour, endMinute] = settings.endTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;
        const frequencyMinutes = parseInt(settings.reminderFrequency) || 60;

        // If frequency is not a valid number, exit
        if (isNaN(frequencyMinutes) || frequencyMinutes <= 0) {
            console.log('Invalid reminder frequency');
            return;
        }

        // Calculate how many notifications to schedule
        const minutesInRange = endTimeMinutes - startTimeMinutes;
        const notificationsCount = Math.floor(minutesInRange / frequencyMinutes);

        // Schedule notifications
        for (let i = 0; i <= notificationsCount; i++) {
            const minutesFromStart = i * frequencyMinutes;
            const reminderTime = new Date();

            // Set to today at the reminder time
            reminderTime.setHours(startHour);
            reminderTime.setMinutes(startMinute + minutesFromStart);
            reminderTime.setSeconds(0);
            reminderTime.setMilliseconds(0);

            // If this time is in the past, schedule for tomorrow
            if (reminderTime < new Date()) {
                reminderTime.setDate(reminderTime.getDate() + 1);
            }

            // Get a personalized message
            const message = await getRandomReminderMessage();

            // Schedule the notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Time to drink water! 💧',
                    body: message,
                    sound: true,
                    data: { 
                        type: 'water_reminder',
                        time: reminderTime.toISOString()
                    },
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.DAILY,
                    hour: reminderTime.getHours(),
                    minute: reminderTime.getMinutes(),
                },
            });
        }

        console.log(`Scheduled ${notificationsCount + 1} notifications`);
    } catch (error) {
        console.error('Error scheduling notifications:', error);
        throw error;
    }
}

// Cancel all notifications
export async function cancelAllNotifications() {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('All notifications canceled');
    } catch (error) {
        console.error('Error canceling notifications:', error);
        throw error;
    }
}

// Create a notification listener
export function createNotificationListener(onNotificationReceived: (notification: Notifications.Notification) => void) {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        onNotificationReceived(notification);
    });

    return notificationListener;
}

// Remove notification listener
export function removeNotificationListener(listener: Notifications.Subscription) {
    Notifications.removeNotificationSubscription(listener);
}