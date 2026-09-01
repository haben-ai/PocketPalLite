/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {it} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer, {act} from 'react-test-renderer';

it('renders correctly', async () => {
  // App's mount effect now awaits two sequential AsyncStorage round trips
  // (persona seeding, then the onboarding-seen check) before its first
  // setState -- this must be awaited inside act(), otherwise that setState
  // lands after the test (and its renderer) has already torn down.
  await act(async () => {
    renderer.create(<App />);
  });
});
