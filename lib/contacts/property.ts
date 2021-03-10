import isTruthy from '../helpers/isTruthy';

/**
 * ICAL library can crash if the value saved in the vCard is improperly formatted
 * If it crash we get the raw value from jCal key
 */
const getRawValues = (property: any): string[] => {
    try {
        return property.getValues();
    } catch (error) {
        const [, , , value = ''] = property.jCal || [];
        return [value];
    }
};

/**
 * Get the value of an ICAL property
 *
 * @return currently an array for the fields adr and categories, a string otherwise
 */
export const getValue = (property: any, field: string): string | string[] => {
    const values = getRawValues(property).map((val: string | string[] | Date) => {
        // adr
        if (Array.isArray(val)) {
            return val;
        }

        if (typeof val === 'string') {
            return val;
        }

        // date
        return val.toString();
    });
    if (field === 'categories') {
        // the ICAL library will parse item1.CATEGORIES:cat1,cat2 with value ['cat1,cat2'], but we expect ['cat1', 'cat2']
        const flatValues = values.flat();
        const splitValues = flatValues.map((value) => value.split(','));
        return splitValues.flat();
    }
    return values[0];
};

/**
 * Transform a custom type starting with 'x-' into normal type
 */
export const clearType = (type = ''): string => type.toLowerCase().replace('x-', '');

/**
 * Given types in an array, return the first type. If types is a string already, return it
 */
export const getType = (types: string | string[] = []): string => {
    if (Array.isArray(types)) {
        if (!types.length) {
            return '';
        }
        return types[0];
    }
    return types;
};

/**
 * Transform an array value for the field 'adr' into a string to be displayed
 */
export const formatAdr = (adr: string[] = []): string => {
    return adr
        .filter(isTruthy)
        .map((value) => value.trim())
        .join(', ');
};
