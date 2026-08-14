// One playback interface over two very different sources:
//   kind 'file' — an mp3 we host, loudness-normalized, seekable, no ads
//   kind 'yt'   — a YouTube video played through the IFrame API, audio only
//
// Nothing is copied for 'yt' clips: the player streams from YouTube, the creator gets the
// view, and we only choose which 20 seconds to play. The video is hidden because the title
// card would give away the answer.
//
// The game talks only to this object, so it never has to know which kind it is playing.
window.HT = window.HT || {};

window.HT.media = function media(audioEl, mountId) {
  const listeners = {};
  const emit = (name) => {
    const fns = listeners[name] || [];
    listeners[name] = fns.filter((l) => !l.once);
    fns.forEach((l) => l.fn());
  };
  const on = (name, fn, once = false) => { (listeners[name] = listeners[name] || []).push({ fn, once }); };

  // ————— file playback: thin pass-through to the <audio> element —————
  for (const ev of ['play', 'pause', 'ended', 'timeupdate', 'seeked']) {
    audioEl.addEventListener(ev, () => { if (mode === 'file') emit(ev); });
  }

  // ————— YouTube —————
  let yt = null, ytReady = false, ytState = -1, ytSeeking = false, pollId = 0, apiPromise = null;

  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      window.onYouTubeIframeAPIReady = () => resolve();
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  async function ensurePlayer() {
    await loadApi();
    if (yt) return yt;
    return new Promise((resolve) => {
      yt = new window.YT.Player(mountId, {
        height: '180', width: '320',
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, fs: 0, iv_load_policy: 3 },
        events: {
          onReady: () => { ytReady = true; resolve(yt); },
          onStateChange: (e) => {
            ytState = e.data;
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) { ytSeeking = false; emit('play'); startPoll(); }
            else if (e.data === S.PAUSED) { emit('pause'); stopPoll(); }
            else if (e.data === S.ENDED) {
              // Stop outright rather than leaving a finished player parked on an end
              // screen that can start something else.
              emit('ended'); stopPoll();
              try { yt.stopVideo(); } catch { /* player already gone */ }
            }
          },
        },
      });
    });
  }

  // The IFrame API has no timeupdate, so drive one ourselves while it plays.
  function startPoll() {
    if (pollId) return;
    pollId = setInterval(() => { if (mode === 'yt') emit('timeupdate'); }, 100);
  }
  function stopPoll() { clearInterval(pollId); pollId = 0; }

  // ————— shared surface —————
  let mode = 'file';
  let current = null;

  const api = {
    on,
    kind: () => mode,

    async load(clip, windowS) {
      current = clip;
      if (clip.kind === 'yt') {
        mode = 'yt';
        audioEl.pause();
        audioEl.removeAttribute('src');
        await ensurePlayer();
        // cueVideoById loads without playing, so the first tap starts instantly.
        //
        // endSeconds MATTERS FOR MORE THAN TIDINESS. The 20 second window used to be enforced
        // only by a 100ms poll in game.js, and browsers throttle timers hard in a backgrounded
        // tab — so a tab left open in the background could run minutes past the window, through
        // the rest of the source video and into YouTube's end screen, playing audio the game
        // never chose. Handing the bound to the player itself means YouTube stops on its own
        // clock whether or not our timer is running.
        yt.cueVideoById({
          videoId: clip.videoId,
          startSeconds: clip.start || 0,
          endSeconds: (clip.start || 0) + (windowS || 20),
        });
        // per-clip gain stands in for the loudness normalization we can't apply to a stream
        yt.setVolume(typeof clip.gain === 'number' ? clip.gain : 70);
      } else {
        mode = 'file';
        stopPoll();
        if (yt && ytReady) yt.stopVideo();
        audioEl.src = clip.url;
        audioEl.load();
      }
    },

    play() {
      if (mode === 'yt') {
        if (!yt) return Promise.reject(new Error('player not ready'));
        yt.playVideo();
        return Promise.resolve();
      }
      return audioEl.play();
    },

    pause() {
      if (mode === 'yt') { if (yt && ytReady) yt.pauseVideo(); stopPoll(); return; }
      audioEl.pause();
    },

    time() {
      if (mode === 'yt') return (yt && ytReady) ? yt.getCurrentTime() : 0;
      return audioEl.currentTime;
    },

    seek(t) {
      if (mode === 'yt') {
        if (!yt || !ytReady) return;
        ytSeeking = true;
        yt.seekTo(t, true);
        // no 'seeked' event exists on the IFrame API; report the landing ourselves
        setTimeout(() => { ytSeeking = false; emit('seeked'); }, 120);
        return;
      }
      audioEl.currentTime = t;
    },

    seeking() { return mode === 'yt' ? ytSeeking : audioEl.seeking; },

    duration() {
      if (mode === 'yt') return (yt && ytReady) ? yt.getDuration() : NaN;
      return audioEl.duration;
    },

    // "can I start playing yet"
    ready() {
      if (mode === 'yt') return ytReady;
      return audioEl.readyState >= 1;
    },

    whenReady(fn) {
      if (mode === 'yt') { ensurePlayer().then(fn); return; }
      audioEl.addEventListener('loadedmetadata', fn, { once: true });
    },

    clear() {
      if (mode === 'yt' && yt && ytReady) yt.stopVideo();
      stopPoll();
      audioEl.pause();
      audioEl.removeAttribute('src');
    },
  };

  return api;
};
