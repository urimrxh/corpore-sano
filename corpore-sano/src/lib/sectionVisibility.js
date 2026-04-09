/**
 * Site-wide section toggles (admin: Global → “Hide on public site”).
 * When a key is `true` in `content.global.sectionsHidden`, that area is hidden.
 */
export function isSectionHidden(content, key) {
  return content?.global?.sectionsHidden?.[key] === true;
}
