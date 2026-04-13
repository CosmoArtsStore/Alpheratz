/** Built-in tweet templates used when no custom template has been saved yet. */
export const DEFAULT_TWEET_TEMPLATES = [
  ['おは{world-name}', '', '#{タグを追加}'].join('\n'),
  ['World: {world-name}', 'Author:', '', '#VRChat_world紹介'].join('\n'),
  ['World: {world-name}', 'Author:', 'Cloth:', '', '#VRChatPhotography'].join('\n'),
];

/** Default active template chosen for first-run settings. */
export const DEFAULT_TWEET_TEMPLATE = DEFAULT_TWEET_TEMPLATES[0];
