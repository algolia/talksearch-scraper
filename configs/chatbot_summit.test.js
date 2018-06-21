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
        speakers: [{ name: 'Piyush Chandra' }],
        video: {
          title:
            'Piyush Chandra // Are Chatbots ready for Enterprise? // Chatbot Summit Berlin 2017',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'video.title',
        'Are Chatbots ready for Enterprise?'
      );
    });

    it('2017, The Ethical Beliefs of Machines', () => {
      const input = {
        speakers: [{ name: 'Nicolai Andersen' }],
        video: {
          title:
            'Chatbot Summit Berlin 2017 // Nicolai Andersen // The Ethical Beliefs of Machines',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'video.title',
        'The Ethical Beliefs of Machines'
      );
    });

    it('2017, Opening Keynote', () => {
      const input = {
        video: {
          title:
            'Yoav Barel, Founder & CEO Chatbot Summit | The 2nd International Chatbot Summit | Opening Keynote',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'video.title',
        'Yoav Barel, Founder & CEO Chatbot Summit | Opening Keynote'
      );
    });

    it('2017, The Secrets of Bots at Scale', () => {
      const input = {
        speakers: [{ name: 'Eran Vanounou' }, { name: 'Adam Orentlicher' }],
        video: {
          title:
            'Eran Vanounou and Adam Orentlicher // The Secrets of Bots at Scale',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty(
        'video.title',
        'Eran Vanounou and Adam Orentlicher // The Secrets of Bots at Scale'
      );
    });
  });
});
