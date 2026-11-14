import { Alert, Platform } from 'react-native';

import { openSystemSettings } from './reminders';

/** Explain that iOS notifications are blocked, with a shortcut to the Settings app. */
export function explainBlockedNotifications() {
  if (Platform.OS === 'web') {
    globalThis.alert?.('Warranty reminders work in the iPhone app.');
    return;
  }
  Alert.alert(
    'Notifications are off',
    'To get warranty reminders, allow notifications for Itemlogger in the Settings app.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: openSystemSettings },
    ],
  );
}
