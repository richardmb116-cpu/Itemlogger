import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { Spacing, useColors } from '@/constants/theme';
import { currencyFor } from '@/lib/tax';
import type { TaxRegion } from '@/lib/types';
import type { SellPlan } from '@/lib/upgrade';

const HEIGHT = 210;
/** SVG text uses the app's font on the web preview; on iPhone it is already the system font. */
const FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, Inter, sans-serif' : undefined;
const PAD = { left: 46, right: 14, top: 22, bottom: 26 };

function compactMoney(n: number, region: TaxRegion): string {
  const { code, locale } = currencyFor(region);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    notation: n >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: n >= 1000 ? 1 : 0,
  }).format(n);
}

/**
 * Resale value over the item's life, with "now", the best time to sell and the warranty end.
 * In "costs" mode: average yearly cost of owning it vs. what keeping it another year costs;
 * where they cross is the best time to sell.
 */
export function ValueChart({
  plan,
  region,
  price,
  warrantyYears,
  mode,
}: {
  plan: SellPlan;
  region: TaxRegion;
  price: number;
  warrantyYears: number | null;
  mode: 'value' | 'costs';
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const fullLife = Math.min(plan.points.length - 1, Math.ceil(plan.profile.lifeYears * 12 * 1.15));
  // The maths view stops a little after the crossing, where the story is.
  const lastMonth =
    mode === 'costs' && showWindowFor(plan) ? Math.min(fullLife, Math.round(plan.bestAge * 12) + 18) : fullLife;
  const pts = plan.points.slice(0, lastMonth + 1);
  const xMax = lastMonth / 12;
  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const costPts = pts.filter((p) => p.age >= 0.5);
  const yMax =
    mode === 'value' ? price : Math.max(1, ...costPts.map((p) => Math.max(p.average ?? 0, p.marginal))) * 1.1;
  const x = (age: number) => PAD.left + (Math.min(age, xMax) / xMax) * innerW;
  const y = (v: number) => PAD.top + innerH - (Math.max(0, Math.min(v, yMax)) / yMax) * innerH;
  const path = (values: { age: number; v: number }[]) =>
    values.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.age).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');

  const step = xMax > 8 ? 2 : 1;
  const xTicks = Array.from({ length: Math.floor(xMax / step) + 1 }, (_, i) => i * step);
  const yTicks = [0, yMax / 2, yMax];
  const showWindow = showWindowFor(plan);
  const bestPoint = pts[Math.min(pts.length - 1, Math.round(plan.bestAge * 12))];
  // Keep the "best time" label clear of the "Now" label when they're close.
  const labelBelow =
    mode === 'value' && !!bestPoint && plan.nowAge <= xMax && Math.abs(x(bestPoint.age) - x(plan.nowAge)) < 110;

  return (
    <View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {/* Grid and axis labels */}
            {yTicks.map((t) => (
              <Line
                key={`g${t}`}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke={c.separator}
                strokeWidth={1}
              />
            ))}
            {yTicks.map((t) => (
              <SvgText
                fontFamily={FONT}
                key={`y${t}`}
                x={PAD.left - 8}
                y={y(t) + 4}
                fontSize={10.5}
                fill={c.textSecondary}
                textAnchor="end">
                {compactMoney(t, region)}
              </SvgText>
            ))}
            {xTicks.map((t) => (
              <SvgText
                fontFamily={FONT}
                key={`x${t}`}
                x={x(t)}
                y={HEIGHT - 6}
                fontSize={10.5}
                fill={c.textSecondary}
                textAnchor="middle">
                {t === 0 ? 'Bought' : `${t}y`}
              </SvgText>
            ))}

            {/* Sell window */}
            {showWindow ? (
              <Rect
                x={x(plan.windowStartAge)}
                y={PAD.top}
                width={Math.max(2, x(plan.windowEndAge) - x(plan.windowStartAge))}
                height={innerH}
                fill={c.accent}
                opacity={0.12}
                rx={6}
              />
            ) : null}

            {/* Warranty end */}
            {warrantyYears && warrantyYears < xMax ? (
              <>
                <Line
                  x1={x(warrantyYears)}
                  x2={x(warrantyYears)}
                  y1={PAD.top}
                  y2={PAD.top + innerH}
                  stroke={c.textTertiary}
                  strokeWidth={1}
                  strokeDasharray="3,4"
                />
                <SvgText
                  fontFamily={FONT}
                  x={x(warrantyYears) + 4}
                  y={PAD.top + 10}
                  fontSize={10}
                  fill={c.textTertiary}>
                  Warranty ends
                </SvgText>
              </>
            ) : null}

            {mode === 'value' ? (
              <>
                <Path
                  d={`${path(pts.map((p) => ({ age: p.age, v: p.value })))} L${x(xMax)},${y(0)} L${x(0)},${y(0)} Z`}
                  fill={c.ink}
                  opacity={0.06}
                />
                <Path
                  d={path(pts.map((p) => ({ age: p.age, v: p.value })))}
                  stroke={c.ink}
                  strokeWidth={2.5}
                  fill="none"
                />
              </>
            ) : (
              <>
                <Path
                  d={path(costPts.map((p) => ({ age: p.age, v: p.average ?? 0 })))}
                  stroke={c.ink}
                  strokeWidth={2.5}
                  fill="none"
                />
                <Path
                  d={path(costPts.map((p) => ({ age: p.age, v: p.marginal })))}
                  stroke={c.accent}
                  strokeWidth={2.5}
                  fill="none"
                />
              </>
            )}

            {/* Best time to sell */}
            {showWindow && bestPoint ? (
              <>
                <Circle
                  cx={x(bestPoint.age)}
                  cy={y(mode === 'value' ? bestPoint.value : (bestPoint.average ?? 0))}
                  r={6}
                  fill={c.accent}
                  stroke={c.background}
                  strokeWidth={2}
                />
                <SvgText
                  fontFamily={FONT}
                  x={x(bestPoint.age)}
                  y={y(mode === 'value' ? bestPoint.value : (bestPoint.average ?? 0)) + (labelBelow ? 22 : -12)}
                  fontSize={11}
                  fontWeight="700"
                  fill={c.accent}
                  textAnchor="middle">
                  {mode === 'value' ? 'Best time to sell' : 'Lines cross'}
                </SvgText>
              </>
            ) : null}

            {/* Now */}
            {mode === 'value' && plan.nowAge <= xMax ? (
              <>
                <Circle
                  cx={x(plan.nowAge)}
                  cy={y(plan.nowValue)}
                  r={5.5}
                  fill={c.ink}
                  stroke={c.background}
                  strokeWidth={2}
                />
                <SvgText
                  fontFamily={FONT}
                  x={x(plan.nowAge)}
                  y={y(plan.nowValue) - 11}
                  fontSize={11}
                  fontWeight="700"
                  fill={c.ink}
                  textAnchor={plan.nowAge < xMax * 0.1 ? 'start' : 'middle'}>
                  Now
                </SvgText>
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
      {mode === 'costs' ? (
        <View style={styles.legend}>
          <LegendDot color={c.ink} label="Average yearly cost if sold at this age" />
          <LegendDot color={c.accent} label="Yearly cost of keeping it" />
        </View>
      ) : null}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const c = useColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <AppText variant="caption" color={c.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingLeft: PAD.left,
    marginTop: Spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 10, height: 3, borderRadius: 2 },
});

function showWindowFor(plan: SellPlan): boolean {
  return plan.status === 'early' || plan.status === 'window' || plan.status === 'late';
}
