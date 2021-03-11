export function importFeedsFromVersion3(): string {
    const feedListSource = localStorage.getItem('feedList');
    localStorage.removeItem('feedList');
    try {
        return JSON.parse(feedListSource).join('\n');
    } catch (error) {
        return '';
    }
}