/* ================= ANALYTICS (ridiculytics) =================
   Off unless ANALYTICS.host is set. Fill in your collector when you self-host the game.
   Inside the claude.ai viewer outside requests are blocked, so it only reports from your own domain. */
const APP_VERSION='__VERSION__';
// Filled in by scripts/build.sh from CHANGELOG.md for this version.
const RELEASE_NOTES=/*__RELEASE_NOTES__*/[];
// A big release's story, shown in full in "What's new" (paragraphs; **bold** allowed). Empty for most releases.
const RELEASE_STORY=/*__RELEASE_STORY__*/[];
const IS_DEV=APP_VERSION.startsWith('__');
// Synthetic training runs do not send telemetry. Legacy SP calls remain harmless.
const ANALYTICS={host:'',site:''};
function track(name,once){}
const PLAY_MARKS=[1,5,15,30,60,120];
