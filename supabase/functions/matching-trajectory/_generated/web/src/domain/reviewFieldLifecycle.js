// Generated from web/src/domain/reviewFieldLifecycle.ts; run node scripts/generate-matching-runtime.mjs. DO NOT EDIT.
export function legacyReviewEntityId(kind, index) {
    return `${kind}_legacy${String(index).padStart(8, "0")}`;
}
export function legacyReviewEntityIdFromValue(kind, index, value) {
    return `${legacyReviewEntityId(kind, index)}${stableToken(JSON.stringify(value)).slice(0, 12)}`;
}
function stableToken(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `${(hash >>> 0).toString(36).padStart(8, "0")}${value.length.toString(36).padStart(4, "0")}`;
}
