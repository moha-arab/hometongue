// Where is ffmpeg?
//
// This broke once already. A previous session npm-installed `ffmpeg-static` inside its own
// temp scratchpad, everything worked, the session ended, and the next one found nothing —
// the binary was sitting in a folder Windows can clear at any time, and was never on PATH.
// It looked like ffmpeg had vanished from the machine. It had never been on the machine.
//
// So: resolve it every time, from most durable location to least, and say plainly where it
// came from. Never assume PATH — a fresh winget install does not reach an already-running
// shell until it restarts.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function works(exe) {
  try {
    execFileSync(exe, ['-version'], { stdio: 'pipe', timeout: 15000 });
    return true;
  } catch { return false; }
}

function* candidates() {
  if (process.env.FFMPEG_PATH) yield ['env FFMPEG_PATH', process.env.FFMPEG_PATH];
  yield ['PATH', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'];

  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  // winget installs under a versioned folder, so glob rather than hardcode the version
  const wingetRoot = path.join(local, 'Microsoft', 'WinGet', 'Packages');
  try {
    for (const pkg of fs.readdirSync(wingetRoot)) {
      if (!/ffmpeg/i.test(pkg)) continue;
      const base = path.join(wingetRoot, pkg);
      for (const build of fs.readdirSync(base)) {
        const exe = path.join(base, build, 'bin', 'ffmpeg.exe');
        if (fs.existsSync(exe)) yield ['winget', exe];
      }
    }
  } catch { /* not windows, or nothing installed */ }

  yield ['winget links', path.join(local, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe')];
  for (const p of ['C:/ffmpeg/bin/ffmpeg.exe', '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg']) {
    yield ['common', p];
  }
}

let cached = null;

export function ffmpegPath() {
  if (cached) return cached;
  for (const [source, exe] of candidates()) {
    if (source !== 'PATH' && source !== 'env FFMPEG_PATH' && !fs.existsSync(exe)) continue;
    if (works(exe)) { cached = { exe, source }; return cached; }
  }
  throw new Error(
    'ffmpeg not found. Install it with:  winget install --id Gyan.FFmpeg --scope user\n'
    + 'or point FFMPEG_PATH at an existing binary.',
  );
}

export function ffprobePath() {
  const { exe, source } = ffmpegPath();
  if (exe.endsWith('.exe') && exe.includes(path.sep)) {
    const probe = exe.replace(/ffmpeg\.exe$/, 'ffprobe.exe');
    if (fs.existsSync(probe)) return { exe: probe, source };
  }
  const probe = exe.replace(/ffmpeg$/, 'ffprobe');
  return { exe: probe, source };
}

// pathToFileURL, not string surgery: Windows absolute paths produce file:///C:/... with
// three slashes, so hand-built comparisons silently never match.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { exe, source } = ffmpegPath();
  const ver = execFileSync(exe, ['-version'], { encoding: 'utf8' }).split('\n')[0];
  console.log(`ffmpeg  via ${source}\n  ${exe}\n  ${ver}`);
  const p = ffprobePath();
  console.log(`ffprobe\n  ${p.exe}  ${fs.existsSync(p.exe) ? 'ok' : 'MISSING'}`);
}
