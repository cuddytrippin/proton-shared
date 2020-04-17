import getRandomValues from 'get-random-values';
import { decodeBase64, encodeBase64 } from 'pmcrypto';

enum CURRENCIES {
    USD = '$',
    EUR = '€',
    CHF = 'CHF'
}

export const getRandomString = (length: number) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let i;
    let result = '';

    const values = getRandomValues(new Uint32Array(length));

    for (i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }

    return result;
};

export const normalize = (value = '') => value.toLowerCase().trim();

export const replaceLineBreak = (content = '') => content.replace(/(?:\r\n|\r|\n)/g, '<br />');

export const toPrice = (amount = 0, currency: keyof typeof CURRENCIES = 'EUR', divisor = 100) => {
    const symbol = CURRENCIES[currency] || currency;
    const value = Number(amount / divisor).toFixed(2);
    const prefix = +value < 0 ? '-' : '';
    const absValue = Math.abs(+value);

    if (currency === 'USD') {
        return `${prefix}${symbol}${absValue}`;
    }

    return `${prefix}${absValue} ${symbol}`;
};

export const addPlus = ([first = '', ...rest] = []) => {
    return [first, rest.length && `+${rest.length}`].filter(Boolean).join(', ');
};

/**
 * Capitalize a string
 */
export const capitalize = (str: string) => {
    if (str === '' || typeof str !== 'string') {
        return '';
    }
    return str[0].toUpperCase() + str.slice(1);
};

/**
 * Given a maximum number of characters to display,
 * truncate a string by adding omission if too long
 */
export const truncate = (str = '', charsToDisplay = 50, omission = '...') => {
    if (str.length === 0) {
        return str;
    }
    if (str.length > charsToDisplay) {
        return str.substring(0, charsToDisplay - omission.length) + omission;
    }
    return str;
};

/**
 * Extract 2 first initials
 */
export const getInitial = (value = '') => {
    const [first = '', second = ''] = value
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') // Remove specific punctuation
        .replace(/\s{2,}/g, ' ') // Remove any extra spaces
        .split(' ');
    return [first, second]
        .filter(Boolean)
        .map((letter = '') => [...letter.toUpperCase()][0]) // We use the spread operator to support Unicode characters
        .join('');
};

/**
 * NOTE: These functions exist in openpgp, but in order to load the application
 * without having to load openpgpjs they are added here.
 */
export const arrayToBinaryString = (bytes: Uint8Array): string => {
    const buffer = new Uint8Array(bytes);
    const bs = 1 << 14;
    const j = bytes.length;
    const result = [];
    for (let i = 0; i < j; i += bs) {
        // @ts-ignore
        // eslint-disable-next-line prefer-spread
        result.push(String.fromCharCode.apply(String, buffer.subarray(i, i + bs < j ? i + bs : j)));
    }
    return result.join('');
};

/**
 * @param {String} str
 * @return {Uint8Array}
 */
export const binaryStringToArray = (str: string) => {
    const result = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        result[i] = str.charCodeAt(i);
    }
    return result;
};

export const encodeBase64URL = (str: string) => {
    return encodeBase64(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

export const decodeBase64URL = (str: string) => {
    return decodeBase64((str + '==='.slice((str.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
};

export const hasProtonDomain = (email = '') => {
    const protonmailRegex = /@(protonmail\.(com|ch)|pm\.me|)$/i;
    return protonmailRegex.test(email);
};

const getMatchingCharacters = (string: string, substring: string) => {
    let i;
    for (i = 0; i < substring.length; ++i) {
        if (string[i] !== substring[i]) {
            return i;
        }
    }
    return i > 0 ? i : 0;
};

export const findLongestMatchingIndex = (strings: string[] = [], substring = '') => {
    let max = 0;
    let i = -1;

    strings.forEach((string, idx) => {
        const numberOfMatches = getMatchingCharacters(string, substring);
        if (numberOfMatches > max) {
            max = numberOfMatches;
            i = idx;
        }
    });

    return i;
};