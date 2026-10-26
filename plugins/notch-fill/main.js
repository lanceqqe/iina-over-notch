// Notch Fill: in full screen, make the video cover the whole screen,
// either by cropping (fill) or by distorting the picture (stretch).
const { core, mpv, event, menu, preferences } = iina;

const MODES = ["off", "fill", "stretch"];
const LABELS = {
  off: "Обычный (вписать)",
  fill: "Заполнить (обрезать края)",
  stretch: "Растянуть (без сохранения пропорций)",
};

let mode = MODES.includes(preferences.get("mode")) ? preferences.get("mode") : "fill";

function apply() {
  const active = core.window.fullscreen === true ? mode : "off";
  if (active === "fill") {
    mpv.set("video-aspect-override", -1);
    mpv.set("panscan", 1.0);
  } else if (active === "stretch") {
    const { width, height } = core.window.frame;
    mpv.set("panscan", 0);
    mpv.set("video-aspect-override", width / height);
  } else {
    mpv.set("panscan", 0);
    mpv.set("video-aspect-override", -1);
  }
}

function setMode(next) {
  mode = next;
  preferences.set("mode", mode);
  apply();
  core.osd("Заполнение экрана: " + LABELS[mode]);
  rebuildMenu();
  // Not during plugin load: forceUpdate then deadlocks IINA's PlayerCore init.
  menu.forceUpdate();
}

function rebuildMenu() {
  menu.removeAllItems();
  menu.addItem(
    menu.item("Переключить режим заполнения", () => {
      setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
    }, { keyBinding: "Meta+Alt+f" })
  );
  menu.addItem(menu.separator());
  for (const m of MODES) {
    menu.addItem(menu.item(LABELS[m], () => setMode(m), { selected: m === mode }));
  }
}

event.on("iina.window-fs.changed", apply);
event.on("iina.window-resized", () => { if (mode === "stretch") apply(); });
event.on("iina.file-loaded", apply);

rebuildMenu();
