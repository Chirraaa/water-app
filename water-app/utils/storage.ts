// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types for our data
export interface UserProfile {
    name: string;
    weight: number;
    activityLevel: string;
    recommendedIntake: number;
}

export interface WaterData {
    date: string;
    intake: number;
    goal: number;
}

export interface AppSettings {
    dailyGoal: number;
    notificationsEnabled: boolean;
    reminderFrequency: string;
    startTime: string;
    endTime: string;
}

// Keys for AsyncStorage
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const USER_PROFILE_KEY = 'user_profile';
const WATER_DATA_PREFIX = 'water_data_';
const APP_SETTINGS_KEY = 'app_settings';

// Check if onboarding is completed
export async function isOnboardingCompleted(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        return value === 'true';
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        return false;
    }
}

// Mark onboarding as completed
export async function completeOnboarding(): Promise<void> {
    try {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch (error) {
        console.error('Error saving onboarding status:', error);
        throw error;
    }
}

// Save user profile
export async function saveUserProfile(profile: UserProfile): Promise<void> {
    try {
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
        console.error('Error saving user profile:', error);
        throw error;
    }
}

// Get user profile
export async function getUserProfile(): Promise<UserProfile | null> {
    try {
        const value = await AsyncStorage.getItem(USER_PROFILE_KEY);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

// Save water data for a specific date
export async function saveWaterData(data: WaterData): Promise<void> {
    try {
        await AsyncStorage.setItem(`${WATER_DATA_PREFIX}${data.date}`, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving water data:', error);
        throw error;
    }
}

// Get water data for a specific date
export async function getWaterData(date: string): Promise<WaterData | null> {
    try {
        const value = await AsyncStorage.getItem(`${WATER_DATA_PREFIX}${date}`);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Error getting water data:', error);
        return null;
    }
}

// Save app settings
export async function saveSettings(settings: AppSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// Get app settings
export async function getSettings(): Promise<AppSettings | null> {
    try {
        const value = await AsyncStorage.getItem(APP_SETTINGS_KEY);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Error getting settings:', error);
        return null;
    }
}

// Helper function to get today's date string
export function getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

// Calculate recommended water intake based on weight and activity level
export function calculateRecommendedIntake(weight: number, activityLevel: string): number {
    // Basic formula: 35ml per kg of body weight
    let baseIntake = weight * 35;

    // Adjust based on activity level
    switch (activityLevel) {
        case 'Sedentary (little or no exercise)':
            // No adjustment
            break;
        case 'Lightly active (light exercise 1-3 days/week)':
            baseIntake *= 1.1; // 10% increase
            break;
        case 'Moderately active (moderate exercise 3-5 days/week)':
            baseIntake *= 1.2; // 20% increase
            break;
        case 'Very active (hard exercise 6-7 days/week)':
            baseIntake *= 1.3; // 30% increase
            break;
        case 'Extra active (very hard exercise & physical job)':
            baseIntake *= 1.4; // 40% increase
            break;
    }

    // Round to the nearest 100ml
    return Math.round(baseIntake / 100) * 100;
}
