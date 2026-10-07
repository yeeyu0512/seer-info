export async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(concurrency, items.length);

    await Promise.all(Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await mapper(items[index]);
        }
    }));

    return results;
}
