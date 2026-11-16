import { useEffect, useState, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Fades and lifts its content in when it mounts. Uses React Native's built-in Animated, so the
 * welcome screen doesn't pull in a whole animation library (about 550 KB on the web) for one effect.
 */
export function FadeIn({ children, style, duration = 600 }: { children: ReactNode; style?: StyleProp<ViewStyle>; duration?: number }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [progress, duration]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
