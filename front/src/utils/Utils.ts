export function formatCurrency(x: number): string {
    if (x >= 10 ** 12) return `${(x / 10 ** 12).toFixed(4)} TZERO`
    if (x >= 10 ** 9) return `${(x / 10 ** 9).toFixed(4)} mTZERO`
    if (x >= 10 ** 6) return `${(x / 10 ** 6).toFixed(4)} µTZERO`
    if (x >= 10 ** 3) return `${(x / 10 ** 3).toFixed(4)} nTZERO`
    return `${x} pTZERO`
}
