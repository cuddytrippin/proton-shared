import JSBI from 'jsbi';

export const hasScope = (scope: string, mask: number) => {
    const scopeInt = JSBI.BigInt(scope);
    const maskInt = JSBI.BigInt(mask);

    return JSBI.equal(JSBI.bitwiseAnd(scopeInt, maskInt), maskInt);
};
