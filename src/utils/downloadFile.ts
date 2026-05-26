import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Speichert einen Blob plattformbedingt:
 * - Web: triggert einen Browser-Download über einen unsichtbaren <a download>-Link
 * - Native (iOS/Android): schreibt die Datei in den Cache-Ordner und öffnet das System-Share-Sheet
 */
export async function downloadFile(blob: Blob, filename: string, mimeType: string): Promise<void> {
    if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 0);
        return;
    }

    const file = new FileSystem.File(FileSystem.Paths.cache, filename);
    if (file.exists) {
        file.delete();
    }
    file.create();
    const buffer = await blob.arrayBuffer();
    file.write(new Uint8Array(buffer));

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
            mimeType,
            dialogTitle: 'Gästeliste exportieren',
            UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
        });
    } else {
        throw new Error('Sharing ist auf diesem Gerät nicht verfügbar');
    }
}
