// Resolve against this module so GitHub Pages project paths are preserved.
const local = path => new URL('../../assets/' + path, import.meta.url).href;
function numericId(id, minimum) {
    if (id == null || id === '' || typeof id === 'boolean') return null;
    const value = Number(id);
    return Number.isInteger(value) && value >= minimum ? value : null;
}
export function typeIconUrl(id) {
    const value = numericId(id, 1);
    return value == null ? '' : local('icons/types/' + value + '.png');
}
export function skinCategoryIconUrl(id) {
    const value = numericId(id, 0);
    return value == null ? '' : local('icons/skin-categories/' + value + '.png');
}
export function genderIconUrl(gender) {
    return ['male','female','sexless'].includes(gender) ? local('icons/gender/' + gender + '.png') : '';
}
export const ASSETS = Object.freeze({
    background: local('site/background.png'), authorAvatar: local('site/author-avatar.png'),
    aboutArtwork: local('site/about-artwork.png'), adminLoginArtwork: local('site/admin-login-artwork.png'),
    seerBase: local('seer/base.png'), seerHead: local('seer/head.png'), attributeSkill: local('icons/skills/attribute.png')
});
