// components/NotificationConfirmation.tsx
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Button, Card, Text, Icon, IconProps } from '@ui-kitten/components';

interface NotificationConfirmationProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
}

const WaterIcon = (props: IconProps) => (
  <Icon {...props} name='droplet-outline' />
);

const CheckIcon = (props: IconProps) => (
  <Icon {...props} name='checkmark-outline' />
);

const CloseIcon = (props: IconProps) => (
  <Icon {...props} name='close-outline' />
);

export const NotificationConfirmation = ({ visible, onClose, onConfirm, amount }: NotificationConfirmationProps) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <Card style={styles.card}>
          <View style={styles.content}>
            <WaterIcon style={styles.icon} fill="#3366FF" />
            <Text category="h5" style={styles.title}>Stay Hydrated!</Text>
            <Text style={styles.message}>
              Did you drink your water? This will add {amount}ml to your daily total.
            </Text>
            <View style={styles.buttonContainer}>
              <Button
                style={[styles.button, styles.confirmButton]}
                status="primary"
                accessoryLeft={CheckIcon}
                onPress={onConfirm}
              >
                I Drank Water
              </Button>
              <Button
                style={styles.button}
                status="basic"
                accessoryLeft={CloseIcon}
                onPress={onClose}
              >
                Remind Me Later
              </Button>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '80%',
    borderRadius: 10,
  },
  content: {
    alignItems: 'center',
    padding: 10,
  },
  icon: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  button: {
    marginTop: 8,
  },
  confirmButton: {
    marginBottom: 8,
  },
});