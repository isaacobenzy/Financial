import * as React from 'react';
import renderer, { act } from 'react-test-renderer';

import { MonoText } from '../StyledText';

jest.mock('../useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

it('renders correctly', () => {
  let tree;
  act(() => {
    tree = renderer.create(<MonoText>Snapshot test!</MonoText>);
  });

  const json = tree.toJSON();
  expect(json).toBeTruthy();
  expect(json.type).toBe('Text');
  expect(json.children).toEqual(['Snapshot test!']);
  expect(JSON.stringify(json.props.style)).toContain('SpaceMono');
});
