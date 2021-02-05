/**
 * Validate the local part of an email string according to the RFC https://tools.ietf.org/html/rfc5321#section-4.1.2;
 * see also https://tools.ietf.org/html/rfc3696#page-5 and https://en.wikipedia.org/wiki/Email_address#Local-part
 *
 * NOTE: Email providers respect the RFC only loosely. We do not want to invalidate addresses that would be accepted by the BE.
 * It is not fully guaranteed that this helper is currently accepting everything that the BE accepts.
 *
 * Examples of RFC rules violated in the wild:
 * * Local parts should have a maximum length of 64 octets
 */
import isTruthy from './isTruthy';
import { MAJOR_DOMAINS } from '../constants';
import { Recipient } from '../interfaces';

export enum CANONIZE_SCHEME {
    DEFAULT,
    PLUS,
    GMAIL,
    PROTON,
}

export const validateLocalPart = (localPart: string) => {
    // remove comments first
    const match = localPart.match(/(^\(.+?\))?([^()]*)(\(.+?\)$)?/);
    if (!match) {
        return false;
    }
    const uncommentedPart = match[2];
    if (/^".+"$/.test(uncommentedPart)) {
        // case of a quoted string
        // The only characters non-allowed are \ and " unless preceded by a backslash
        const quotedText = uncommentedPart.slice(1, -1);
        const chunks = quotedText
            .split('\\"')
            .map((chunk) => chunk.split('\\\\'))
            .flat();
        return !chunks.some((chunk) => /"|\\/.test(chunk));
    }
    return !/[^a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]|^\.|\.$|\.\./.test(uncommentedPart);
};

/**
 * Validate the domain of an email string according to the preferred name syntax of the RFC https://tools.ietf.org/html/rfc1034.
 * Actually almost anything is allowed as domain name https://tools.ietf.org/html/rfc2181#section-11, but we stick
 * to the preferred one, allowing undescores which are common in the wild.
 * See also https://en.wikipedia.org/wiki/Email_address#Domain
 */
export const validateDomain = (domain: string) => {
    if (domain.length > 255) {
        return false;
    }
    if (/\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\]/.test(domain)) {
        return true;
    }
    const dnsLabels = domain.toLowerCase().split('.').filter(isTruthy);
    if (dnsLabels.length < 2) {
        return false;
    }
    const topLevelDomain = dnsLabels.pop() as string;
    if (!/[a-z]{2,}/.test(topLevelDomain)) {
        return false;
    }
    return !dnsLabels.some((label) => {
        return /[^a-z0-9-_]|^-|-$/.test(label);
    });
};

/**
 * Split an email into local part plus domain.
 */
export const getEmailParts = (email: string) => {
    const endIdx = email.lastIndexOf('@');
    if (endIdx === -1) {
        return {
            localPart: email,
            domain: '',
            hasAt: false,
        };
    }
    return {
        localPart: email.slice(0, endIdx),
        domain: email.slice(endIdx + 1),
        hasAt: true,
    };
};

/**
 * Validate an email string according to the RFC https://tools.ietf.org/html/rfc5322;
 * see also https://en.wikipedia.org/wiki/Email_address
 */
export const validateEmailAddress = (email: string) => {
    const { localPart, domain } = getEmailParts(email);
    if (!localPart || !domain) {
        return false;
    }
    return validateLocalPart(localPart) && validateDomain(domain);
};

const removePlusAliasLocalPart = (localPart = '') => {
    const [cleanLocalPart] = localPart.split('+');
    return cleanLocalPart;
};

export const removePlusAlias = (email = '') => {
    const { localPart, domain, hasAt } = getEmailParts(email);
    const cleanLocalPart = removePlusAliasLocalPart(localPart);
    return hasAt ? `${cleanLocalPart}@${domain}` : `${cleanLocalPart}`;
};

/**
 * Add plus alias part for an email
 */
export const addPlusAlias = (email = '', plus = '') => {
    const { localPart, domain, hasAt } = getEmailParts(email);
    if (localPart.indexOf('+') !== -1) {
        // the email contains an alias already
        return email;
    }

    return hasAt ? `${localPart}+${plus}@${domain}` : `${localPart}+${plus}`;
};

/**
 * Canonize an email address following one of the known schemes
 * Emails that have the same canonical form end up in the same inbox
 * See https://confluence.protontech.ch/display/MBE/Canonize+email+addresses
 */
export const canonizeEmail = (email: string, scheme = CANONIZE_SCHEME.DEFAULT) => {
    if (!validateEmailAddress(email)) {
        throw new Error('Cannot canonize invalid email address');
    }
    const { localPart, domain } = getEmailParts(email);
    if (scheme === CANONIZE_SCHEME.PROTON) {
        const cleanLocalPart = removePlusAliasLocalPart(localPart);
        const normalizedLocalPart = cleanLocalPart.replace(/[._-]/g, '').toLowerCase();
        const normalizedDomain = domain.toLocaleLowerCase();

        return `${normalizedLocalPart}@${normalizedDomain}`;
    }
    if (scheme === CANONIZE_SCHEME.GMAIL) {
        const cleanLocalPart = removePlusAliasLocalPart(localPart);
        const normalizedLocalPart = cleanLocalPart.replace(/[.]/g, '').toLowerCase();
        const normalizedDomain = domain.toLocaleLowerCase();

        return `${normalizedLocalPart}@${normalizedDomain}`;
    }
    if (scheme === CANONIZE_SCHEME.PLUS) {
        const cleanLocalPart = removePlusAliasLocalPart(localPart);
        const normalizedLocalPart = cleanLocalPart.toLowerCase();
        const normalizedDomain = domain.toLocaleLowerCase();

        return `${normalizedLocalPart}@${normalizedDomain}`;
    }
    const normalizedLocalPart = localPart.toLowerCase();
    const normalizedDomain = domain.toLocaleLowerCase();

    return `${normalizedLocalPart}@${normalizedDomain}`;
};

export const canonizeInternalEmail = (email: string) => canonizeEmail(email, CANONIZE_SCHEME.PROTON);

/**
 * Canonize an email by guessing the scheme that should be applied
 * ATTENTION: This helper will never be able to guess that Proton scheme must be applied on custom domains;
 * Only the back-end knows about custom domains. Use GET /addresses/canonical in those cases
 * @param email
 */
export const canonizeEmailByGuess = (email: string) => {
    const { domain } = getEmailParts(email);
    const normalizedDomain = domain.toLocaleLowerCase();
    if (['protonmail.com', 'protonmail.ch', 'pm.me'].includes(normalizedDomain)) {
        return canonizeEmail(email, CANONIZE_SCHEME.PROTON);
    }
    if (['gmail.com', 'googlemail.com', 'google.com'].includes(normalizedDomain)) {
        return canonizeEmail(email, CANONIZE_SCHEME.GMAIL);
    }
    if (['outlook.com', 'yandex.ru', 'mail.ru'].includes(normalizedDomain) || /^hotmail\./.test(normalizedDomain)) {
        return canonizeEmail(email, CANONIZE_SCHEME.PLUS);
    }
    return canonizeEmail(email, CANONIZE_SCHEME.DEFAULT);
};

const extractStringItems = (str: string) => {
    return str.split(',').filter(isTruthy);
};

/**
 * Try to decode an URI string with the native decodeURI function.
 * Return the original string if decoding fails
 */
const decodeURISafe = (str: string) => {
    try {
        return decodeURI(str);
    } catch (e) {
        return str;
    }
};

/**
 * Extract "to address" and headers from a mailto URL https://tools.ietf.org/html/rfc6068
 */
export const parseMailtoURL = (mailtoURL: string, decode = true) => {
    const mailtoString = 'mailto:';
    const toString = 'to=';
    if (!mailtoURL.toLowerCase().startsWith(mailtoString)) {
        throw new Error('Malformed mailto URL');
    }
    const url = mailtoURL.substring(mailtoString.length);
    const [tos, hfields = ''] = url.split('?');
    const addressTos = extractStringItems(tos).map((to) => (decode ? decodeURISafe(to) : to));
    const headers = hfields.split('&').filter(isTruthy);
    const headerTos = headers
        .filter((header) => header.toLowerCase().startsWith('to='))
        .map((headerTo) => extractStringItems(headerTo.substring(toString.length)))
        .flat()
        .map((to) => (decode ? decodeURISafe(to) : to));
    return { to: [...addressTos, ...headerTos] };
};

export const buildMailTo = (email = '') => `mailto:${email}`;

export const getEmailTo = (str: string, decode?: boolean): string => {
    try {
        const {
            to: [emailTo],
        } = parseMailtoURL(str, decode);
        return emailTo;
    } catch (e) {
        return str;
    }
};

export const majorDomainsMatcher = (inputValue: string) => {
    const { localPart, domain: domainPart } = getEmailParts(inputValue);
    if (!localPart || typeof domainPart !== 'string') {
        return [];
    }
    return MAJOR_DOMAINS.map((domain) => {
        const email = `${localPart}@${domain}`;
        return { Address: email, Name: email } as Recipient;
    });
};
