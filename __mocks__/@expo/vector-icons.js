const React = require('react');

const createMockComponent = (name) => {
  const Component = (props) => React.createElement(name, props);
  Component.displayName = name;
  return Component;
};

module.exports = {
  Ionicons: createMockComponent('Ionicons'),
  MaterialIcons: createMockComponent('MaterialIcons'),
  FontAwesome: createMockComponent('FontAwesome'),
};
