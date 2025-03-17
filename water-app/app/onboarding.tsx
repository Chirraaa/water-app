// app/onboarding.tsx
import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import {
    Layout,
    Text,
    Card,
    Input,
    Button,
    Select,
    SelectItem,
    IndexPath,
    Spinner
} from '@ui-kitten/components';
import {
    saveUserProfile,
    completeOnboarding,
    calculateRecommendedIntake,
    saveSettings
} from '../utils/storage';

export default function OnboardingScreen() {
    const [name, setName] = useState('');
    const [weight, setWeight] = useState('');
    const [activityLevel, setActivityLevel] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<IndexPath | undefined>();
    const [loading, setLoading] = useState(false);

    const activityOptions = [
        'Sedentary (little or no exercise)',
        'Lightly active (light exercise 1-3 days/week)',
        'Moderately active (moderate exercise 3-5 days/week)',
        'Very active (hard exercise 6-7 days/week)',
        'Extra active (very hard exercise & physical job)'
    ];

    const handleContinue = async () => {
        // Validate inputs
        if (!name || !weight || !activityLevel) {
            Alert.alert('Missing Information', 'Please fill in all fields to continue.');
            return;
        }

        const weightNum = parseFloat(weight);
        if (isNaN(weightNum) || weightNum <= 0) {
            Alert.alert('Invalid Weight', 'Please enter a valid weight.');
            return;
        }

        setLoading(true);

        try {
            // Calculate recommended water intake
            const recommendedIntake = calculateRecommendedIntake(weightNum, activityLevel);

            // Save user profile
            await saveUserProfile({
                name,
                weight: weightNum,
                activityLevel,
                recommendedIntake
            });

            // Initialize app settings with the recommended intake
            await saveSettings({
                dailyGoal: recommendedIntake,
                notificationsEnabled: true,
                reminderFrequency: '60', // Default to hourly reminders
                startTime: '8:00',
                endTime: '22:00'
            });

            // Mark onboarding as completed
            await completeOnboarding();

            // Navigate to the main app
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Error during onboarding:', error);
            Alert.alert('Error', 'There was a problem saving your information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text category='h1' style={styles.title}>Welcome to WaterApp</Text>
                <Text category='s1' style={styles.subtitle}>Let's set up your profile to calculate your ideal water intake</Text>

                <Card style={styles.card}>
                    <Text category='h6'>Personal Information</Text>

                    <Input
                        style={styles.input}
                        label='Your Name'
                        placeholder='Enter your name'
                        value={name}
                        onChangeText={setName}
                    />

                    <Input
                        style={styles.input}
                        label='Weight (kg)'
                        placeholder='Enter your weight'
                        keyboardType='number-pad'
                        value={weight}
                        onChangeText={setWeight}
                    />

                    <Text category='label' style={styles.inputLabel}>Activity Level</Text>
                    <Select
                        style={styles.select}
                        placeholder='Select your activity level'
                        selectedIndex={selectedIndex}
                        onSelect={index => {
                            setSelectedIndex(index as IndexPath);
                            setActivityLevel(activityOptions[(index as IndexPath).row]);
                        }}
                        value={activityLevel}
                    >
                        {activityOptions.map((option, index) => (
                            <SelectItem key={index} title={option} />
                        ))}
                    </Select>

                    <Button
                        style={styles.continueButton}
                        onPress={handleContinue}
                        accessoryLeft={loading ? () => <Spinner size='small' /> : undefined}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Continue'}
                    </Button>
                </Card>
            </ScrollView>
        </Layout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        flexGrow: 1,
        justifyContent: 'center',
    },
    title: {
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
    },
    card: {
        marginVertical: 16,
    },
    input: {
        marginTop: 16,
    },
    inputLabel: {
        marginTop: 16,
    },
    select: {
        marginTop: 8,
    },
    continueButton: {
        marginTop: 24,
    },
});