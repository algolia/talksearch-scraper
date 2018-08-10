import config from '../criticalrole.js';
import helper from '../config-helper.js';

describe('criticalrole', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    describe('The Mighty Nein', () => {
      it('should get data from Campaign 2', () => {
        const input = {
          video: {
            title:
              'The Stalking Nightmare | Critical Role | Campaign 2, Episode 29',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'The Stalking Nightmare');
        expect(actual).toHaveProperty('video.campaignNumber', 2);
        expect(actual).toHaveProperty('video.episodeNumber', 29);
      });
    });

    describe('Vox Machina', () => {
      it('should get data from Campaign 1', () => {
        const input = {
          video: {
            title: "Yug'voril Uncovered - Critical Role RPG Show: Episode 9",
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', "Yug'voril Uncovered");
        expect(actual).toHaveProperty('video.campaignNumber', 1);
        expect(actual).toHaveProperty('video.episodeNumber', 9);
      });

      it('works even when there is no colon', () => {
        const input = {
          video: {
            title: 'The Path to Whitestone | Critical Role RPG Show Episode 27',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'The Path to Whitestone');
        expect(actual).toHaveProperty('video.campaignNumber', 1);
        expect(actual).toHaveProperty('video.episodeNumber', 27);
      });

      it('works with guest star', () => {
        const input = {
          video: {
            title:
              'Cindergrove Revisited | Critical Role RPG Show Episode 46 w/ CHRIS HARDWICK',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'Cindergrove Revisited');
        expect(actual).toHaveProperty('video.campaignNumber', 1);
        expect(actual).toHaveProperty('video.episodeNumber', 46);
      });

      it('works with multiparts', () => {
        const input = {
          video: {
            title: 'Reunions | Critical Role RPG Show Episode 33, pt. 2',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'Reunions, part 2');
        expect(actual).toHaveProperty('video.campaignNumber', 1);
        expect(actual).toHaveProperty('video.episodeNumber', 33);
      });
    });
  });
});
