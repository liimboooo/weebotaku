module.exports = {
  EMAIL_NOTIFICATIONS: {
    key: 'emailNotifs',
    label: 'Enable email notifications',
    description: 'Receive notifications via email',
    default: true,
  },
  NEW_EPISODES: {
    key: 'newEpisodes',
    label: 'New episode alerts',
    description: 'Get notified when new episodes air',
    default: true,
  },
  COMMUNITY_ACTIVITY: {
    key: 'communityActivity',
    label: 'Community activity',
    description: 'Replies, mentions, and reactions',
    default: false,
  },
  FRIENDS_ACTIVITY: {
    key: 'friendsActivity',
    label: 'Friend activity',
    description: 'See what your friends are watching',
    default: false,
  },
  SYSTEM_UPDATES: {
    key: 'systemUpdates',
    label: 'System updates',
    description: 'Platform changes and new features',
    default: true,
  },
  WEEKLY_RECS: {
    key: 'weeklyRecs',
    label: 'Weekly recommendations',
    description: 'Personalized anime suggestions',
    default: true,
  },
  PUSH_NOTIFICATIONS: {
    key: 'pushNotifs',
    label: 'Enable push notifications',
    description: 'Receive browser push notifications',
    default: true,
  },
  NEWS_NOTIFICATIONS: {
    key: 'newsNotifications',
    label: 'News notifications',
    description: 'Trending anime, trailers, and new episodes',
    default: true,
  },
  NEW_EPISODE_ALERTS: {
    key: 'newEpisodeAlerts',
    label: 'New episodes',
    description: 'Instant alerts for new episodes',
    default: true,
  },
  COMMENT_REPLIES: {
    key: 'commentReplies',
    label: 'Comment replies',
    description: 'When someone replies to your comment',
    default: true,
  },
  FRIEND_REQUESTS: {
    key: 'friendRequests',
    label: 'Friend requests',
    description: 'When someone sends you a friend request',
    default: true,
  },
  ANIME_RECS: {
    key: 'animeRecs',
    label: 'Anime recommendations',
    description: 'Personalized anime suggestions',
    default: false,
  },
  NEW_FEATURES: {
    key: 'newFeatures',
    label: 'New features announcement',
    description: 'Updates about new platform features',
    default: false,
  },
};

module.exports.NOTIFICATION_SETTINGS = Object.values(module.exports);
module.exports.NOTIFICATION_SETTINGS_KEYS = Object.values(module.exports).map(s => s.key);