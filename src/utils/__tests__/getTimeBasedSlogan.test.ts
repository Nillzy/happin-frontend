import { getTimeBasedSlogan } from '../getTimeBasedSlogan';

describe('getTimeBasedSlogan', () => {
  beforeEach(() => {
    // Reset Date mock before each test
    jest.restoreAllMocks();
  });

  it('should return morning slogan for hours 6-9', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Was geht heute?');
    expect(result.secondLine).toBe('Finde es heraus.');
  });

  it('should return afternoon slogan for hours 10-17', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Pläne für heute Abend?');
    expect(result.secondLine).toBe("Mach' Dir welche.");
  });

  it('should return evening slogan for hours 18-21', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Heute Abend noch nichts vor?');
    expect(result.secondLine).toBe("Hol' Dir Inspiration.");
  });

  it('should return night slogan for hours 22-23', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Noch wach?');
    expect(result.secondLine).toBe('Wir auch.');
  });

  it('should return night slogan for hours 0-5', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Noch wach?');
    expect(result.secondLine).toBe('Wir auch.');
  });

  it('should handle edge case at hour 6 (morning start)', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(6);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Was geht heute?');
  });

  it('should handle edge case at hour 10 (afternoon start)', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Pläne für heute Abend?');
  });

  it('should handle edge case at hour 18 (evening start)', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Heute Abend noch nichts vor?');
  });

  it('should handle edge case at hour 22 (night start)', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(22);

    const result = getTimeBasedSlogan();

    expect(result.firstLine).toBe('Noch wach?');
  });
});
