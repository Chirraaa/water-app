// utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { AppSettings, getUserProfile } from './storage';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

// Configure notifications with a category for action buttons
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Expanded list of funny reminder messages
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
    "Water you waiting for, {name}? Time to hydrate! 💧",
    "Breaking news: {name}'s water bottle files missing persons report! 📰",
    "Dear {name}, your future self called to thank you for drinking water now! ⏰",
    "Plot twist, {name}: You can't run on empty! Hydrate or evaporate! 🏃‍♂️",
    "Dehydration causes confusion. Wait, who am I texting again? Oh right, {name}! 🤔",
    "{name}, if you were a car, your water level would be blinking red right now! 🚗",
    "Hey {name}, remember that time you drank water and felt amazing? Let's do that again! 🎉",
    "Alert: {name}'s brain is 75% water and currently running on fumes! 🧠",
    "Roses are red, violets are blue, {name} needs water, this reminder's for you! 🌹",
    "{name}, your water bottle called. It's feeling ghosted. Don't be that person! 👻",
    "Did you know that {name} + H2O = Awesomeness? It's science! 🧪",
    "Hey {name}, that headache might just be your brain's way of requesting water! 🤕",
    "{name}, hydration is the key to unlocking your superpowers! ⚡",
    "Warning: {name}'s productivity decreases by 20% when dehydrated! 📊",
    "Dear {name}, your skin called and is begging for hydration! 💅",
    "Fun fact: {name} becomes 10% more charming when properly hydrated! ✨"
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
            // Enable notification importance for Android
            // This makes notifications harder to dismiss
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    // Register notification categories with actions
    await Notifications.setNotificationCategoryAsync('water_reminder', [
        {
            identifier: 'CONFIRM_DRINK',
            buttonTitle: 'I Drank Water! 💧',
            options: {
                isDestructive: false,
                isAuthenticationRequired: false,
            },
        },
        {
            identifier: 'REMIND_LATER',
            buttonTitle: 'Remind Me Later',
            options: {
                isDestructive: false,
                isAuthenticationRequired: false,
            },
        },
    ]);

    return finalStatus === 'granted';
}

// Get a random reminder message
async function getRandomReminderMessage(): Promise<string> {
    try {
        const userProfile = await getUserProfile();
        const name = userProfile?.name || "Hydration Hero";
        
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

            // Schedule the notification with category for action buttons
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Time to drink water! 💧',
                    body: message,
                    sound: true,
                    data: { 
                        type: 'water_reminder',
                        time: reminderTime.toISOString()
                    },
                    categoryIdentifier: 'water_reminder',
                    sticky: true, // Makes notification persistent on Android
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

// Handle notification response (when user taps action button)
export async function handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { actionIdentifier, notification } = response;
    
    if (actionIdentifier === 'CONFIRM_DRINK') {
        // User confirmed they drank water
        // Update water intake
        try {
            const { data } = notification.request.content;
            // You can emit an event or use a callback to update the water intake
            console.log('User confirmed drinking water', data);
            return true;
        } catch (error) {
            console.error('Error handling confirmation', error);
        }
    } else if (actionIdentifier === 'REMIND_LATER') {
        // Schedule a reminder for 15 minutes later
        try {
            const reminderTime = new Date();
            reminderTime.setMinutes(reminderTime.getMinutes() + 15);
            
            const message = await getRandomReminderMessage();
            
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Reminder: Drink Water! 💧',
                    body: message,
                    sound: true,
                    data: { 
                        type: 'water_reminder',
                        time: reminderTime.toISOString()
                    },
                    categoryIdentifier: 'water_reminder',
                    sticky: true,
                },
                trigger: {
                    type: SchedulableTriggerInputTypes.DAILY,
                    hour: reminderTime.getHours(),
                    minute: reminderTime.getMinutes(),
                },
            });
            
            console.log('Scheduled reminder for 15 minutes later');
        } catch (error) {
            console.error('Error scheduling reminder', error);
        }
    }
    
    return false;
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