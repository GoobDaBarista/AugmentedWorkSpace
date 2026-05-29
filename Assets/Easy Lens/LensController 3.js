// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent settings_icon
//@input Component.ScriptComponent touch_events


try {

// Settings icon interactive behavior: hit-test taps and animate feedback using only allowed properties.

// Internal state for a mock "settings enabled" toggle
let settingsEnabled = false;

// Compute approximate on-screen rect for the sticker using its center position and scale.
// Assumes the sticker occupies a normalized rect proportional to scale.
// Tune hitboxMultiplier to adjust clickable padding around the icon.
const hitboxMultiplier = 0.6; // fraction of scale treated as half-extent per axis

function isPointInIcon(px, py) {
    // Read current icon transform
    const center = script.settings_icon.position; // vec2 in [0..1]
    const scale = script.settings_icon.scale;     // vec2 in [0.05..1.0]

    // Approximate half extents
    const halfW = (scale.x * hitboxMultiplier) * 0.5;
    const halfH = (scale.y * hitboxMultiplier) * 0.5;

    // Axis-aligned hit test (ignores rotation for simplicity)
    return (px >= center.x - halfW && px <= center.x + halfW &&
            py >= center.y - halfH && py <= center.y + halfH);
}

// Simple pulse animation on the icon scale and a slight rotation nudge for visual feedback
let animActive = false;
let animTime = 0;
let animDuration = 0.25; // seconds for the full pulse cycle
let baseScale = null;
let baseRotation = 0;

function startFeedbackAnimation() {
    if (!baseScale) {
        baseScale = new vec2(script.settings_icon.scale.x, script.settings_icon.scale.y);
    } else {
        baseScale.x = script.settings_icon.scale.x;
        baseScale.y = script.settings_icon.scale.y;
    }
    baseRotation = script.settings_icon.rotation;
    animTime = 0;
    animActive = true;
}

// Per-frame update to drive the pulse animation
const updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(function() {
    if (!animActive) {
        return;
    }
    animTime += getDeltaTime();
    const t = MathUtils.clamp(animTime / animDuration, 0, 1);

    // Ease out then in using a simple sine curve
    const eased = Math.sin(t * Math.PI); // 0->1->0 over duration
    const scalePulse = 1 + 0.12 * eased; // up to +12% at peak
    const rotPulse = (settingsEnabled ? 10 : -10) * eased; // degrees offset at peak

    // Apply animated properties
    script.settings_icon.scale = new vec2(baseScale.x * scalePulse, baseScale.y * scalePulse);
    script.settings_icon.rotation = baseRotation + rotPulse;

    if (t >= 1) {
        // Restore to base at end
        script.settings_icon.scale = new vec2(baseScale.x, baseScale.y);
        script.settings_icon.rotation = baseRotation;
        animActive = false;
    }
});

// Fastest response: use onTouchDown
script.touch_events.onTouchDown.add(function(touchId, x, y) {
    if (!script.settings_icon.enabled) {
        return;
    }
    if (isPointInIcon(x, y)) {
        // Toggle settings state
        settingsEnabled = !settingsEnabled;

        // Kick feedback animation
        startFeedbackAnimation();
    }
});

} catch(e) {
  print("error in controller");
  print(e);
}
