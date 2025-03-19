// app/index.tsx
import React, { useEffect, useState } from 'react';
import { Redirect } from "expo-router";
import { Layout, Spinner } from '@ui-kitten/components';
import { StyleSheet, View } from 'react-native';
import { isOnboardingCompleted } from '../utils/storage';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await isOnboardingCompleted();
        setHasCompleted(completed);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, []);

  if (loading) {
    return (
      <Layout style={styles.container}>
        <Spinner size='large' />
      </Layout>
    );
  }

  if (hasCompleted) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/onboarding" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});