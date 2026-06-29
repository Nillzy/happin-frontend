// Mock for react-native-reanimated
const Reanimated = {
  default: {
    call: () => {},
  },
  useSharedValue: (val) => ({ value: val }),
  useAnimatedStyle: (cb) => cb(),
  withTiming: (val) => val,
  withSpring: (val) => val,
  withSequence: (...args) => args[args.length - 1],
  withDelay: (delay, val) => val,
  withRepeat: (val) => val,
  Easing: {
    out: (fn) => fn,
    in: (fn) => fn,
    inOut: (fn) => fn,
    quad: () => {},
    cubic: () => {},
    linear: () => {},
  },
};

module.exports = Reanimated;
