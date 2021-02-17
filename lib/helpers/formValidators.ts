import { c } from 'ttag';
import { validateEmailAddress } from './email';

export const requiredValidator = (value: any) =>
    value === '' || value === undefined || value === null ? c('Error').t`This field is required` : '';
export const emailValidator = (value: string) => (validateEmailAddress(value) ? c('Error').t`Email is not valid` : '');
