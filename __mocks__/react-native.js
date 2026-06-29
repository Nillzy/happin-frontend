module.exports = {
  Platform: {
    OS: 'web',
    select: (obj) => obj.web || obj.default,
  },
  StyleSheet: {
    create: (styles) => styles,
    hairlineWidth: 1,
  },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Image: 'Image',
  Dimensions: {
    get: () => ({ width: 375, height: 667 }),
    addEventListener: jest.fn(),
  },
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  Pressable: 'Pressable',
  Alert: {
    alert: jest.fn(),
  },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Touchable: {
    Mixin: {
      componentDidMount: jest.fn(),
      componentWillUnmount: jest.fn(),
      touchableHandlePress: jest.fn(),
    },
  },
};
