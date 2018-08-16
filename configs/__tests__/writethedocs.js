import config from '../writethedocs.js';
import helper from '../config-helper.js';

describe('writethedocs', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('Conference Year', () => {
      const input = {
        playlist: {
          title: 'Write the Docs Europe 2015',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('conference.year', 'Europe 2015');
    });

    describe('Portland 2018', () => {
      it('getting speaker and title', () => {
        const input = {
          playlist: {
            title: 'Write the Docs Portland 2018',
          },
          video: {
            title:
              'Building Empathy-Driven Developer Documentation - Kat King - Write the Docs Portland 2018',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty(
          'video.title',
          'Building Empathy-Driven Developer Documentation'
        );
        expect(actual).toHaveProperty('speakers', [{ name: 'Kat King' }]);
      });
    });
    describe('Portland 2017', () => {
      it('getting speaker and title', () => {
        const input = {
          playlist: {
            title: 'Write the Docs Portland 2017',
          },
          video: {
            title:
              'Write the Docs Portland 2017: Building navigation for your doc site: 5 best practices by Tom Johnson',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty(
          'video.title',
          'Building navigation for your doc site: 5 best practices'
        );
        expect(actual).toHaveProperty('speakers', [{ name: 'Tom Johnson' }]);
      });
    });

    describe('Prage 2017', () => {
      it('getting speaker and title', () => {
        const input = {
          playlist: {
            title: 'Write the Docs Prague 2017',
          },
          video: {
            title:
              'Write the Docs Prague 2017: Telling a Great Story on GitHub by Lauri Apple',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty(
          'video.title',
          'Telling a Great Story on GitHub'
        );
        expect(actual).toHaveProperty('speakers', [{ name: 'Lauri Apple' }]);
      });
    });

    describe('2014 - 2016', () => {
      it('Lightning talks', () => {
        const input = {
          video: {
            title: 'Lightning talks - Day 2',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'Lightning talks - Day 2');
      });
      it('several speakers', () => {
        const input = {
          video: {
            title: 'Florian Scholz & Jean-Yves Perrier - Gardening Open Docs',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'Gardening Open Docs');
        expect(actual).toHaveProperty('speakers', [
          { name: 'Florian Scholz' },
          { name: 'Jean-Yves Perrier' },
        ]);
      });
      it('getting speaker and title', () => {
        const input = {
          video: {
            title: 'Tom Christie - Designing MkDocs',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'Designing MkDocs');
        expect(actual).toHaveProperty('speakers', [{ name: 'Tom Christie' }]);
      });
    });
  });
});
