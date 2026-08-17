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
  // emit carries an optional payload so 'error' can say WHICH clip died. Without it, a dead
  // video's complaint arriving a beat late was indistinguishable from the current clip failing,
  // and the game would throw away a perfectly good replacement on the old clip's error.
  const emit = (name, info) => {
    const fns = listeners[name] || [];
    listeners[name] = fns.filter((l) => !l.once);
    fns.forEach((l) => l.fn(info));
  };
  const on = (name, fn, once = false) => { (listeners[name] = listeners[name] || []).push({ fn, once }); };
  // PER-SOURCE ids, not one shared one. A single curClipId restamped on every load() is useless
  // as a staleness marker: the restamp happens in the same synchronous task as the deck swap, so
  // by the time any error event can be DELIVERED the shared id already names the replacement, and
  // a stale complaint sails through wearing the new clip's id. Splitting by source at least makes
  // cross-kind staleness detectable — a YouTube error carries the last YT-cued id, which a file
  // replacement does not share. Same-kind staleness is unknowable here (the IFrame API does not
  // say which video an error belongs to), so the game layer adds time- and state-based guards.
  let ytClipId = null, fileClipId = null;

  // ————— file playback: thin pass-through to the <audio> element —————
  for (const ev of ['play', 'pause', 'ended', 'timeupdate', 'seeked']) {
    audioEl.addEventListener(ev, () => { if (mode === 'file') emit(ev); });
  }
  // A file that 404s or decodes badly fires 'error' and never 'loadedmetadata', so whenReady's
  // one-shot listener waits forever and the round stays on "Clip is loading, one sec…" with no
  // retry and no way out.
  audioEl.addEventListener('error', () => { if (mode === 'file') emit('error', { id: fileClipId }); });

  // ————— YouTube —————
  let yt = null, ytReady = false, ytState = -1, ytSeeking = false, pollId = 0, apiPromise = null, playerPromise = null;

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

  // ONE INITIALISATION, SHARED, AND ONLY RESOLVED WHEN THE PLAYER IS GENUINELY READY.
  //
  // This returned early on `if (yt)`, and `yt` is assigned synchronously inside the promise
  // executor below — so a second call during the two hundred milliseconds before onReady fires got
  // the player object back instantly with ytReady still false. game.js:336 then saw !media.ready(),
  // called whenReady(playClip), which called this, which returned instantly, which called playClip:
  // a loop entirely in microtasks, so the browser never yielded and the tab hard-froze. The six
  // second rescue timeout could not fire because the task queue was never reached.
  //
  // Tapping play the moment a round appears is enough to hit it.
  async function ensurePlayer() {
    await loadApi();
    if (yt && ytReady) return yt;
    if (playerPromise) return playerPromise;
    playerPromise = new Promise((resolve) => {
      yt = new window.YT.Player(mountId, {
        height: '180', width: '320',
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, fs: 0, iv_load_policy: 3 },
        events: {
          onReady: () => { ytReady = true; resolve(yt); },
          // WITHOUT THIS, A DEAD VIDEO IS A DEAD ROUND AND NOBODY IS TOLD.
          // YouTube reports 100 for removed or private, 101 and 150 for "the owner disabled
          // embedding", 2 and 5 for a bad request or an unplayable player. With no onError the
          // codes were swallowed: ready() still returned true (the PLAYER is fine, the VIDEO is
          // not) and play() resolved anyway, so the game set playing = true and sat there
          // burning the listening budget on silence. Clips are other people's uploads, so
          // some of them WILL disappear after launch — this is the difference between a
          // swapped clip and a round that just does nothing.
          //
          // ytReady MUST SURVIVE THIS. It used to be set false here, and onReady fires exactly
          // once per player construction — so the FIRST dead video poisoned the player for the
          // rest of the session: ready() false forever, whenReady() silent forever, and every
          // later YouTube clip died as "would not load" even though nothing was wrong with it.
          // 44 of 155 clips stream from YouTube (13 of 22 English, 9 of 13 Hindi-Urdu, all 3
          // German), so one removed upload could quietly wreck whole decks. The two facts the
          // old line conflated are separate: the PLAYER is still initialised, only the VIDEO is
          // bad — and cueing the next video makes the same player work again.
          // Gated on mode: a YouTube error arriving after the round has moved to a hosted file
          // is stale by definition and is dropped at the source.
          onError: () => { if (mode === 'yt') emit('error', { id: ytClipId }); },
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
    return playerPromise;
  }

  // The IFrame API has no timeupdate, so drive one ourselves while it plays.
  function startPoll() {
    if (pollId) return;
    pollId = setInterval(() => { if (mode === 'yt') emit('timeupdate'); }, 100);
  }
  function stopPoll() { clearInterval(pollId); pollId = 0; }

  // ————— shared surface —————
  let mode = 'file';
  // The one pending loadedmetadata callback, held so a new load or a clear can withdraw it.
  // whenReady used to hand the raw function to addEventListener and forget it, which was safe
  // only by accident: with preload="none" metadata never arrived unbidden. preload='auto' made
  // it arrive on every load, so an unwithdrawn listener from round N started round N+1's audio
  // by itself.
  let pendingReady = null;
  function dropPendingReady() {
    if (pendingReady) { audioEl.removeEventListener('loadedmetadata', pendingReady); pendingReady = null; }
  }

  const api = {
    on,
    kind: () => mode,

    async load(clip, windowS) {
      // A new load orphans any pending "call me when the metadata lands" request. Without this,
      // preload='auto' turned that listener into a self-starting play: metadata for the NEXT
      // round's clip arrived spontaneously and fired a playClip nobody asked for.
      dropPendingReady();
      if (clip.kind === 'yt') {
        ytClipId = clip.id || null;
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
        fileClipId = clip.id || null;
        mode = 'file';
        stopPoll();
        if (yt && ytReady) yt.stopVideo();
        // The markup says preload="none", which quietly contradicted the caller's "preload now so
        // play starts instantly": with none, load() runs to a suspend point without fetching, so
        // ready() stayed false at the first tap and a slow connection could run out playClip's six
        // second deadline and swap a clip that was merely still downloading. Set here rather than
        // in the HTML so the behaviour rides with the code that depends on it.
        audioEl.preload = 'auto';
        audioEl.src = clip.url;
        audioEl.load();
      }
    },

    play() {
      if (mode === 'yt') {
        if (!yt || !ytReady) return Promise.reject(new Error('player not ready'));
        // RESOLVE WHEN IT IS ACTUALLY PLAYING, not when we asked it to. This returned
        // Promise.resolve() the instant playVideo() was called, so game.js set playing = true and
        // showed a pause button — whether or not a single frame arrived. Autoplay policy, data
        // saver, iOS low-power mode and a stall YouTube does not report as an error all end the
        // same way: silence, a button that does nothing because playing is already true, and a
        // listening budget draining against nothing. The round dies with no message at all.
        //
        // Four seconds is well past a normal start and short enough that the caller's own error
        // handling still feels like a response to the tap.
        return new Promise((resolve, reject) => {
          let settled = false;
          const done = (fn, arg) => { if (!settled) { settled = true; fn(arg); } };
          // Registered through on(), which stores { fn, once } — a bare push would never be
          // called, because emit() invokes l.fn. Both are once-listeners, so emit clears them; the
          // settled flag covers the case where the other one fires first.
          on('play', () => done(resolve), true);
          on('error', () => done(reject, new Error('yt_error')), true);
          setTimeout(() => done(reject, new Error('yt_no_start')), 4000);
          yt.playVideo();
          if (ytState === 1) done(resolve);
        });
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
      // ONLY CALL BACK IF IT IS ACTUALLY READY. If construction itself never completes (the API
      // script blocked, the iframe refused), calling fn anyway put playClip straight back into the
      // loop above and hard-froze the tab. Staying silent is correct: game.js already starts a six
      // second deadline before waiting on this, and that swaps the clip out. A dead VIDEO no
      // longer holds ytReady false — that poisoned every later clip — it surfaces through onError
      // and play()'s rejection instead.
      if (mode === 'yt') { ensurePlayer().then(() => { if (ytReady) fn(); }); return; }
      dropPendingReady();
      pendingReady = () => { pendingReady = null; fn(); };
      audioEl.addEventListener('loadedmetadata', pendingReady, { once: true });
    },

    clear() {
      dropPendingReady();
      if (mode === 'yt' && yt && ytReady) yt.stopVideo();
      stopPoll();
      audioEl.pause();
      audioEl.removeAttribute('src');
    },
  };

  return api;
};
