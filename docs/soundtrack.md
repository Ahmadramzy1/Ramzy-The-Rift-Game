# Supplied soundtrack

The settings playlist includes the existing Going Under and 8bit Stranger Things plus six user-supplied originals: Bon Jovi — Runaway; Scorpions — Rock You Like a Hurricane; The Police — Every Breath You Take; Kate Bush — Running Up That Hill; The Clash — Should I Stay or Should I Go; David Bowie — Heroes.

Files are copied unchanged into `public/audio/` with URL-safe filenames, preserving MP3/M4A formats. There are no embedded third-party players or advertisements. Settings select the starting track; all eight play sequentially and wrap to the first. Stage starts restart the selected recording; music/SFX volumes remain independent and saved.

`LazyLoopingMusic` decodes only the current and next song. It starts the selected track as soon as it is ready and schedules the next with a one-second crossfade. Finished buffers are released and stale fetches are aborted on stop/restart. This avoids downloading/decoding all eight long recordings before playback and retaining hundreds of megabytes of unused PCM. The existing eager transport remains available for older harnesses.

Focused unit checks cover lazy loading, eight-track wraparound, cancellation and the existing fade/restart behavior. `tests/audio.html` checks browser decoding of every supplied file and exercises an accelerated real Web Audio loop with muted test output. Packaged paths are checked for GitHub Pages.
