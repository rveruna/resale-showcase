// Icon fonts load through expo-font, which has no asset registry under Jest.
jest.mock('@expo/vector-icons', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { MaterialCommunityIcons: ({ name }) => createElement(Text, null, name) };
});
