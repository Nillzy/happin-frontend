import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';

const TRACK_W = 56;
const TRACK_H = 28;
const THUMB_SIZE = 22;
const THUMB_PADDING = 3;
const THUMB_TRAVEL = TRACK_W - THUMB_SIZE - THUMB_PADDING * 2;

function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2.5" fill="none" />
      <Line x1="12" y1="2" x2="12" y2="5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="2" y1="12" x2="5" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="19" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="19.78" y1="4.22" x2="17.66" y2="6.34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="6.34" y1="17.66" x2="4.22" y2="19.78" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke={color}
        strokeWidth="2"
        fill={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function DarkLightToggle() {
  const { isDark, toggleTheme } = useTheme();

  const progress = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isDark ? 1 : 0, { damping: 18, stiffness: 200 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['#e8e0f0', '#2d2640']),
  }));

  const sunOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(1 - progress.value, { duration: 180 }),
  }));

  const moonOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(progress.value, { duration: 180 }),
  }));

  return (
    <Pressable onPress={toggleTheme} accessibilityRole="switch" accessibilityLabel="Theme wechseln">
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.iconLeft, sunOpacity]}>
          <SunIcon color="#f5a623" />
        </Animated.View>

        <Animated.View style={[styles.iconRight, moonOpacity]}>
          <MoonIcon color="#E0A8F8" />
        </Animated.View>

        <Animated.View style={[styles.thumb, thumbStyle]}>
          {isDark ? <MoonIcon color="#8B3DC8" /> : <SunIcon color="#D4006B" />}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    position: 'absolute',
    left: THUMB_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    position: 'absolute',
    left: THUMB_PADDING + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    position: 'absolute',
    right: THUMB_PADDING + 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
