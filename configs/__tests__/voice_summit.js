import config from '../voice_summit.js';
import helper from '../config-helper.js';

describe('voice_summit', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('getting speaker and title', () => {
      const input = {
        video: {
          title:
            'cathy pearl - i can do that, dave- voice assistants have arrived-',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'video.title',
        'I can do that, dave - Voice assistants have arrived'
      );
      expect(actual).toHaveProperty('speakers', [{ name: 'Cathy Pearl' }]);
    });

    it('removing keynote from title', () => {
      const input = {
        video: {
          title:
            'david isbitski - keynote- learning to talk again in a voice-first world',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'video.title',
        'Learning to talk again in a voice-first world'
      );
      expect(actual).toHaveProperty('speakers', [{ name: 'David Isbitski' }]);
    });

    it('extracting panel speakers', () => {
      const input = {
        video: {
          title:
            'panel- fintech leads the voice-first revolution - chris hopen, aakrit vaish, david heafitz, kountin',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'video.title',
        'Fintech leads the voice-first revolution'
      );
      expect(actual).toHaveProperty('speakers', [
        { name: 'Chris Hopen' },
        { name: 'Aakrit Vaish' },
        { name: 'David Heafitz' },
        { name: 'Kountin' },
      ]);
    });

    it('several speakers', () => {
      const input = {
        video: {
          title:
            'j z, noriaki tatsumi, mark dickinson and timmy liu - rich, clever, fast, and famous',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'video.title',
        'Rich, clever, fast, and famous'
      );
      expect(actual).toHaveProperty('speakers', [
        { name: 'J Z' },
        { name: 'Noriaki Tatsumi' },
        { name: 'Mark Dickinson' },
        { name: 'Timmy Liu' },
      ]);
    });
  });
});
