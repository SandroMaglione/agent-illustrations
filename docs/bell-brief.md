# Brief: the bell character (both makers get exactly this)

Colour `public/bell.png` (1024 x 1536, an original character: a hotel concierge with a desk bell and a key) so that it looks like the references in `public/refs/` (ref-a to ref-d). Ignore their characters and designs; only how they are rendered matters: clear outline, solid shadows, subsurface scattering, solid shapes.

- Follow `docs/process.md` (then named splash-process.md): its passes, numbers and checks, including the findings of the repeatability run at the end.
- Rules are frozen: do not edit `src/splash/engine.ts` or `src/splash/tones.ts`. Write only drawing data in `src/splash/bell-seeds.ts` and `src/splash/bell.ts`. `twin.ts` and `tape.ts` are worked examples of the same type.
- The line art's drawing is fixed. Add details and extras where they improve the image or the style match: prints, trim, patterns, reflections on metal, floating graphics. Use the hooks `face`, `over`, `back`, `front`, or shapes.
- No image generation, no pasted images. Everything is code.
- Design choices (palette, extras) are yours.
- Refine on your own as many times as you need. Look at the render at full size and at crops, and compare it with the references. No outside review.

Deliver
1. `output/bell-final.png`, 2048 x 3072: `node scripts/snap.ts output/bell-final.png "v=bell&k=3&zoom=2" 2048 3072`
2. `docs/bell-notes.md`, under 300 words: palette and extras chosen, what you checked, how many self-review rounds, counts of colour marks, corrections, cast rules and placed shapes, and what you think is weakest.
