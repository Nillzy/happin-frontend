import { GRADIENT_PAIRS, getGradient, getGradientByIndex, GradientId } from '../gradients';

describe('gradients', () => {
  describe('GRADIENT_PAIRS', () => {
    it('should have 8 gradient pairs', () => {
      expect(GRADIENT_PAIRS).toHaveLength(8);
    });

    it('each gradient pair should have 2 color strings', () => {
      GRADIENT_PAIRS.forEach((pair) => {
        expect(pair).toHaveLength(2);
        expect(typeof pair[0]).toBe('string');
        expect(typeof pair[1]).toBe('string');
      });
    });

    it('all colors should start with #', () => {
      GRADIENT_PAIRS.forEach((pair) => {
        expect(pair[0]).toMatch(/^#/);
        expect(pair[1]).toMatch(/^#/);
      });
    });
  });

  describe('getGradient', () => {
    it('should return correct gradient for id 0', () => {
      const result = getGradient(0);
      expect(result).toEqual(['#D4006B', '#8B3DC8']);
    });

    it('should return correct gradient for id 1', () => {
      const result = getGradient(1);
      expect(result).toEqual(['#8B3DC8', '#42dae2']);
    });

    it('should return correct gradient for id 7', () => {
      const result = getGradient(7);
      expect(result).toEqual(['#F64F59', '#C0392B']);
    });

    it('should return gradient pair with 2 colors', () => {
      const result = getGradient(3);
      expect(result).toHaveLength(2);
      expect(typeof result[0]).toBe('string');
      expect(typeof result[1]).toBe('string');
    });
  });

  describe('getGradientByIndex', () => {
    it('should return first gradient for index 0', () => {
      const result = getGradientByIndex(0);
      expect(result).toEqual(GRADIENT_PAIRS[0]);
    });

    it('should return second gradient for index 1', () => {
      const result = getGradientByIndex(1);
      expect(result).toEqual(GRADIENT_PAIRS[1]);
    });

    it('should wrap around for index >= 8', () => {
      const result = getGradientByIndex(8);
      expect(result).toEqual(GRADIENT_PAIRS[0]);
    });

    it('should wrap around for index 9', () => {
      const result = getGradientByIndex(9);
      expect(result).toEqual(GRADIENT_PAIRS[1]);
    });

    it('should wrap around for large index', () => {
      const result = getGradientByIndex(16);
      expect(result).toEqual(GRADIENT_PAIRS[0]);
    });

    it('should handle index 15 correctly', () => {
      const result = getGradientByIndex(15);
      expect(result).toEqual(GRADIENT_PAIRS[7]);
    });

    it('should return gradient pair with 2 colors for any index', () => {
      const result = getGradientByIndex(100);
      expect(result).toHaveLength(2);
      expect(typeof result[0]).toBe('string');
      expect(typeof result[1]).toBe('string');
    });
  });
});
