import { downloadFile } from '../downloadFile';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Mock expo modules
jest.mock('expo-file-system', () => {
  const mockFile = {
    exists: false,
    delete: jest.fn(),
    create: jest.fn(),
    write: jest.fn(),
    uri: 'file:///mock/path/test.pdf',
  };

  return {
    File: jest.fn().mockImplementation(() => mockFile),
    Paths: {
      cache: '/mock/cache/',
    },
    __mockFile: mockFile, // Export for test access
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

// Mock DOM for web tests
const mockDocument = {
  createElement: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

const mockURL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
};

// @ts-ignore
global.document = mockDocument;
// @ts-ignore
global.URL = mockURL;

describe('downloadFile', () => {
  let mockBlob: Blob;
  let mockClick: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBlob = new Blob(['test content'], { type: 'application/pdf' });

    // Reset mock document
    mockClick = jest.fn();
    mockDocument.createElement.mockReturnValue({
      click: mockClick,
      href: '',
      download: '',
    });
  });

  describe('Web Platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        writable: true,
        configurable: true,
      });
    });

    it('downloads file successfully on web', async () => {
      await downloadFile(mockBlob, 'test.pdf', 'application/pdf');

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
      expect(mockDocument.body.removeChild).toHaveBeenCalled();
    });

    it('sets download attribute correctly', async () => {
      const mockLink = {
        click: mockClick,
        href: '',
        download: '',
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      await downloadFile(mockBlob, 'report.csv', 'text/csv');

      expect(mockLink.download).toBe('report.csv');
    });

    it('creates object URL for blob', async () => {
      const mockLink = {
        click: mockClick,
        href: '',
        download: '',
      };
      mockDocument.createElement.mockReturnValue(mockLink);

      await downloadFile(mockBlob, 'test.pdf', 'application/pdf');

      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockURL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it('cleans up DOM elements after download', async () => {
      await downloadFile(mockBlob, 'test.pdf', 'application/pdf');

      expect(mockDocument.body.appendChild).toHaveBeenCalledTimes(1);
      expect(mockDocument.body.removeChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('Native Platform (iOS/Android)', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });
    });

    it('shares file successfully on native when sharing available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await downloadFile(mockBlob, 'test.pdf', 'application/pdf');

      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///mock/path/test.pdf',
        expect.objectContaining({
          mimeType: 'application/pdf',
          dialogTitle: 'Gästeliste exportieren',
          UTI: 'com.adobe.pdf',
        })
      );
    });

    it('uses correct UTI for PDF files', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      await downloadFile(mockBlob, 'report.pdf', 'application/pdf');

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          UTI: 'com.adobe.pdf',
        })
      );
    });

    it('uses correct UTI for CSV files', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      await downloadFile(mockBlob, 'report.csv', 'text/csv');

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          UTI: 'public.comma-separated-values-text',
        })
      );
    });

    it('creates file in cache directory', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      await downloadFile(mockBlob, 'test.pdf', 'application/pdf');

      expect(FileSystem.File).toHaveBeenCalledWith('/mock/cache/', 'test.pdf');
    });

    it('deletes existing file before creating new one', async () => {
      const mockFile = (FileSystem as any).__mockFile;
      mockFile.exists = true;
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      await downloadFile(mockBlob, 'test.pdf', 'application/pdf');

      expect(mockFile.delete).toHaveBeenCalled();
      expect(mockFile.create).toHaveBeenCalled();
    });

    it('writes blob content to file', async () => {
      const mockFile = (FileSystem as any).__mockFile;
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      await downloadFile(mockBlob, 'test.pdf', 'application/pdf');

      expect(mockFile.write).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('throws error when sharing not available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      await expect(
        downloadFile(mockBlob, 'test.pdf', 'application/pdf')
      ).rejects.toThrow('Sharing ist auf diesem Gerät nicht verfügbar');
    });

    it('should invoke Sharing.shareAsync on Android when sharing is available', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
        configurable: true,
      });
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

      await expect(
        downloadFile(mockBlob, 'test.pdf', 'application/pdf')
      ).resolves.not.toThrow();

      expect(Sharing.shareAsync).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty blob', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const emptyBlob = new Blob([], { type: 'application/pdf' });

      await expect(
        downloadFile(emptyBlob, 'empty.pdf', 'application/pdf')
      ).resolves.not.toThrow();
    });

    it('handles special characters in filename', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      await downloadFile(mockBlob, 'Gästeliste_2024-01-01.pdf', 'application/pdf');

      expect(mockDocument.createElement).toHaveBeenCalled();
    });

    it('handles very large filenames', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });
      const longFilename = 'a'.repeat(200) + '.pdf';

      await expect(
        downloadFile(mockBlob, longFilename, 'application/pdf')
      ).resolves.not.toThrow();
    });
  });
});
