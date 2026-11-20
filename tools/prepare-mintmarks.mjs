import { pathToFileURL } from 'node:url';
import { latestMintmarkRefresh, LOCAL_MINTMARKS, PUBLISHED_MINTMARKS, syncPublishedMintmarks } from './mintmark-files.mjs';
import { refreshMintmarkFiles } from './fetch-mintmarks.mjs';

export async function preparePublishedMintmarks({
    directory = LOCAL_MINTMARKS, source = PUBLISHED_MINTMARKS,
    now = new Date(), refreshRequested = false, sync = syncPublishedMintmarks, refresh = refreshMintmarkFiles,
} = {}) {
    let published;
    try { published = await sync({ directory, source }); }
    catch (error) {
        // Only an absent manifest permits first-publication bootstrap. A timeout,
        // malformed manifest or missing content file must stop publication.
        if (!error.manifestMissing) throw error;
    }
    if (!published || refreshRequested || new Date(published.fetchedAt) < latestMintmarkRefresh(now)) {
        await refresh({ directory });
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await preparePublishedMintmarks({
        source: process.env.MINTMARK_SOURCE_URL || PUBLISHED_MINTMARKS,
        refreshRequested: process.env.MINTMARK_REFRESH === 'true',
    });
}
