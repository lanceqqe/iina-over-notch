// Video Info: badges with the resolution, frame rate and HDR format of the playing video.
const { core, mpv, event, menu, overlay, preferences } = iina;

const STYLE = `
  .badges {
    position: absolute; top: 40px; right: 14px;
    display: flex; gap: 6px;
    font: 600 12px -apple-system, BlinkMacSystemFont, sans-serif;
    text-shadow: none;
  }
  .badge {
    padding: 3px 8px; border-radius: 6px;
    color: #fff; background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  }
  .hdr { color: #1a1300; background: #f5c542; }
  .hlg { color: #fff; background: #2f80ed; }
  .dv  { color: #fff; background: linear-gradient(90deg, #6a3df0, #c23de0); }
  .badges.in  { animation: fade-in 0.25s ease-out both; }
  .badges.out { animation: fade-out 0.25s ease-in both; }
  @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
`;

let visible = preferences.get("visible") !== false;
let overlayReady = false;
// Follows IINA's on screen controls (IINA Over Notch sends "iina.controls-visibility.changed").
// Other IINA builds never send it, so the badges then simply stay on.
let controlsShown = true;
let lastRendered = "";

function resolutionLabel(w) {
  if (w >= 7600) return "8K";
  if (w >= 3800) return "4K";
  if (w >= 2500) return "1440p";
  if (w >= 1900) return "1080p";
  if (w >= 1260) return "720p";
  return "";
}

function formatFps(fps) {
  return String(Math.round(fps * 1000) / 1000);
}

function badges() {
  const w = mpv.getNumber("video-params/w");
  const h = mpv.getNumber("video-params/h");
  if (!(w > 0 && h > 0)) return [];  // audio only, or nothing loaded yet

  const label = resolutionLabel(w);
  const list = [{ text: `${w}×${h}` + (label ? ` · ${label}` : "") }];

  let fps = mpv.getNumber("container-fps");
  if (!(fps > 0)) fps = mpv.getNumber("estimated-vf-fps");
  if (fps > 0) list.push({ text: `${formatFps(fps)} fps` });

  const dvProfile = mpv.getNumber("current-tracks/video/dolby-vision-profile");
  const gamma = mpv.getString("video-params/gamma");
  if (dvProfile > 0) {
    list.push({ text: `Dolby Vision ${dvProfile}`, cls: "dv" });
  } else if (gamma === "pq") {
    list.push({ text: "HDR10", cls: "hdr" });
  } else if (gamma === "hlg") {
    list.push({ text: "HLG", cls: "hlg" });
  }
  return list;
}

function render() {
  if (!overlayReady) return;
  const list = visible ? badges() : [];
  if (list.length === 0) {
    lastRendered = "";
    overlay.hide();
    return;
  }
  const spans = list.map(b => `<span class="badge ${b.cls || ""}">${b.text}</span>`).join("");
  const html = `<div class="badges ${controlsShown ? "in" : "out"}">${spans}</div>`;
  // Re-inserting the same content would replay the fade animation.
  if (html === lastRendered) return;
  lastRendered = html;
  overlay.setContent(html);
  overlay.show();
}

event.on("iina.window-loaded", () => {
  overlay.simpleMode();
  overlay.setStyle(STYLE);
  overlayReady = true;
  render();
});

event.on("iina.controls-visibility.changed", (shown) => {
  controlsShown = shown;
  render();
});

event.on("iina.file-loaded", render);
// video-params is a node property, so watch the reconfig event rather than the property.
event.on("mpv.video-reconfig", render);
event.on("mpv.container-fps.changed", render);
event.on("mpv.vid.changed", render);

menu.addItem(
  menu.item("Показывать информацию о видео", () => {
    visible = !visible;
    preferences.set("visible", visible);
    core.osd(visible ? "Информация о видео: показана" : "Информация о видео: скрыта");
    render();
  }, { keyBinding: "Meta+Alt+i" })
);
