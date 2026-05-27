/**
 * Bildet einen `user_agent`-String auf einen lesbaren Geräte-Namen ab.
 *
 * Native (Format: "ios 17.0" / "android 14"): wird zu "iPhone (iOS 17.0)" /
 * "Android (14)" expandiert. Web: gängige Browser/OS-Kombinationen werden
 * detektiert; bei Unbekanntem wird der UA gekürzt zurückgegeben.
 */

export interface DeviceLabel {
    name: string;
    icon: 'mobile' | 'web';
}

const NATIVE_RE = /^(ios|android)\s+(.+)$/i;

export function deviceLabelFromUserAgent(
    userAgent: string | null | undefined,
    platformHint?: 'ios' | 'android' | 'web',
): DeviceLabel {
    if (!userAgent) {
        return { name: platformHint === 'web' ? 'Browser' : 'Gerät', icon: platformHint === 'web' ? 'web' : 'mobile' };
    }

    // Native: aus Frontend kommt "ios 17.0" / "android 14"
    const native = NATIVE_RE.exec(userAgent.trim());
    if (native) {
        const os = native[1].toLowerCase();
        const version = native[2];
        if (os === 'ios') return { name: `iPhone (iOS ${version})`, icon: 'mobile' };
        return { name: `Android (${version})`, icon: 'mobile' };
    }

    // Web: bestes Bemühen — Browser + OS aus navigator.userAgent extrahieren.
    const browser = detectBrowser(userAgent);
    const os = detectOs(userAgent);
    if (browser && os) return { name: `${browser} (${os})`, icon: 'web' };
    if (browser) return { name: browser, icon: 'web' };

    // Fallback: rohen UA gekürzt anzeigen.
    const trimmed = userAgent.length > 60 ? `${userAgent.slice(0, 57)}…` : userAgent;
    return { name: trimmed, icon: platformHint === 'web' ? 'web' : 'mobile' };
}

function detectBrowser(ua: string): string | null {
    if (/edg\//i.test(ua)) return 'Edge';
    if (/firefox\//i.test(ua)) return 'Firefox';
    if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return 'Chrome';
    if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return 'Safari';
    if (/opr\//i.test(ua) || /opera\//i.test(ua)) return 'Opera';
    return null;
}

function detectOs(ua: string): string | null {
    if (/windows nt/i.test(ua)) return 'Windows';
    if (/mac os x/i.test(ua) && !/iphone|ipad/i.test(ua)) return 'macOS';
    if (/iphone|ipad/i.test(ua)) return 'iOS';
    if (/android/i.test(ua)) return 'Android';
    if (/linux/i.test(ua)) return 'Linux';
    return null;
}
