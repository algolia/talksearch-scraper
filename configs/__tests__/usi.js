import config from '../usi.js';
import helper from '../config-helper.js';

describe('USI', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it("Pour faire naître une idée - Cédric Villani, à l'USI", () => {
      const input = {
        video: {
          title: "Pour faire naître une idée - Cédric Villani, à l'USI",
        },
      };

      const actual = current(input);

      expect(actual).toMatchSnapshot();
    });
  });
});
