import {describe, it, expect} from '@jest/globals';

import {shouldPromptForRating} from './appRating';

describe('shouldPromptForRating', () => {
  const fresh = {shownCount: 0, done: false};

  it('does not ask on the very first launch', () => {
    expect(shouldPromptForRating(1, fresh)).toBe(false);
  });

  it('asks on the second launch', () => {
    expect(shouldPromptForRating(2, fresh)).toBe(true);
  });

  it('does not re-ask right after a "Not now"', () => {
    expect(shouldPromptForRating(3, {shownCount: 1, done: false})).toBe(false);
    expect(shouldPromptForRating(4, {shownCount: 1, done: false})).toBe(false);
  });

  it('asks one last time on the fifth launch after a "Not now"', () => {
    expect(shouldPromptForRating(5, {shownCount: 1, done: false})).toBe(true);
  });

  it('never asks a third time', () => {
    expect(shouldPromptForRating(50, {shownCount: 2, done: false})).toBe(false);
  });

  it('never asks once the user has rated or sent feedback', () => {
    expect(shouldPromptForRating(2, {shownCount: 0, done: true})).toBe(false);
    expect(shouldPromptForRating(9, {shownCount: 1, done: true})).toBe(false);
  });
});
