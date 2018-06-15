/* eslint-disable import/no-commonjs */
import config from './chatbot_summit.js';
import helper from '../src/config-helper.js';

describe('Chatbot Summit', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('2017, Chatbots ready for enterprise', () => {
      const input = {
        video: {
          title:
            'Piyush Chandra // Are Chatbots ready for Enterprise? // Chatbot Summit Berlin 2017',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('author.name', 'Piyush Chandra');
      expect(actual).toHaveProperty(
        'video.title',
        'Are Chatbots ready for Enterprise?'
      );
    });

    it('2017, The Ethical Beliefs of Machines', () => {
      const input = {
        video: {
          title:
            'Chatbot Summit Berlin 2017 // Nicolai Andersen // The Ethical Beliefs of Machines',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('author.name', 'Nicolai Andersen');
      expect(actual).toHaveProperty(
        'video.title',
        'The Ethical Beliefs of Machines'
      );
    });

    xit('2017, Opening Keynote', () => {
      const input = {
        video: {
          title:
            'Yoav Barel, Founder & CEO Chatbot Summit | The 2nd International Chatbot Summit | Opening Keynote',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'author.name',
        'Yoav Barel, Founder & CEO Chatbot Summit'
      );
      expect(actual).toHaveProperty('video.title', 'Opening Keynote');
    });
  });
});
