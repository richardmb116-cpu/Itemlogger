import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { useColors } from '@/constants/theme';

/** A ring that fills with the protection score, with the number in the middle. */
export function ProgressRing({ score, size = 72, stroke = 8 }: { score: number; size?: number; stroke?: number }) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 100 ? c.green : c.accent;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.fill} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${length * filled} ${length}`}
        />
      </Svg>
      <AppText
        variant={size >= 120 ? 'largeTitle' : 'headline'}
        style={{ fontVariant: ['tabular-nums'], fontWeight: '800' }}
        accessibilityLabel={`Protection score ${score} out of 100`}>
        {score}
      </AppText>
    </View>
  );
}
