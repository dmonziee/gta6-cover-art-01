// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows the finished cover alone, full-screen.
// `photo` picks the first sample, `photo2` the second, `caption` the title,
// `sub` the subtitle, `size` square|portrait|wide, `layout` hero|grid|strips
// and `grade` sunset|neon|noir. window.__shotReady is set once painted, so
// a screenshot taken after it is never half-drawn.

export async function runShot(query, api) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.setSize(query.get('size') ?? 'wide');
  api.setLayout(query.get('layout') ?? 'hero');
  api.setGrade(query.get('grade') ?? 'sunset');
  api.setTitle(
    query.get('caption') ?? 'SUNSET HEIST',
    query.get('sub') ?? 'VICE CITY NIGHTS',
  );
  await api.loadSamples(query.get('photo') ?? 'pier', query.get('photo2') ?? 'boulevard');
  // The title font is a file under app/fonts: wait for it before drawing,
  // or the lettering falls back to a system font in the screenshot.
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch {
    // A font that cannot load still leaves a readable fallback.
  }
  api.redraw();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
