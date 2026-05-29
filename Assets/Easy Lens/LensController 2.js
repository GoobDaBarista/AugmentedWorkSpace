// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent handTracking
//@input Component.ScriptComponent touchEvents
//@input Component.ScriptComponent draggablePoint1
//@input Component.ScriptComponent draggablePoint2
//@input Component.ScriptComponent draggablePoint3
//@input Component.ScriptComponent draggablePoint4


try {

// Draggable 3D points with Spectacles hand-tracking priority and touch fallback.
// Note: 3D Object Upper Body block exposes only enabled, attachmentPoint, scale. We cannot set 3D positions via this API.
// To provide interactive feedback, we dynamically adjust scale while an object is being “dragged”.
// Limitation: Without transform access, we cannot actually move the 3D objects in space in this script.
// The code still implements robust grab selection logic and multi-input control flow.

var points = [
    { block: script.draggablePoint1, draggingSource: null, baseScale: script.draggablePoint1.scale },
    { block: script.draggablePoint2, draggingSource: null, baseScale: script.draggablePoint2.scale },
    { block: script.draggablePoint3, draggingSource: null, baseScale: script.draggablePoint3.scale },
    { block: script.draggablePoint4, draggingSource: null, baseScale: script.draggablePoint4.scale }
];

// Utility to set visual feedback during drag (scale up)
function setDragging(idx, dragging, source) {
    var p = points[idx];
    p.draggingSource = dragging ? source : null;
    var targetScale = dragging ? p.baseScale * 1.3 : p.baseScale;
    p.block.scale = targetScale;
}

// Simple round-robin selector since we cannot compute proximity without positions.
// Left pinch picks next available point not currently dragged by right; right pinch similar.
var nextSelectIndexLeft = 0;
var nextSelectIndexRight = 0;

function selectNextFreePoint(startIndex, avoidSource) {
    for (var i = 0; i < points.length; i++) {
        var idx = (startIndex + i) % points.length;
        var p = points[idx];
        if (p.draggingSource === null || p.draggingSource === avoidSource) {
            return idx;
        }
    }
    return -1;
}

// Hand tracking: use pinch to grab/release with visual feedback
script.handTracking.onLeftPinchDown.add(function() {
    var idx = selectNextFreePoint(nextSelectIndexLeft, "right");
    if (idx === -1) {
        return;
    }
    setDragging(idx, true, "left");
    nextSelectIndexLeft = (idx + 1) % points.length;
});

script.handTracking.onLeftPinchUp.add(function() {
    for (var i = 0; i < points.length; i++) {
        if (points[i].draggingSource === "left") {
            setDragging(i, false, null);
        }
    }
});

script.handTracking.onRightPinchDown.add(function() {
    var idx = selectNextFreePoint(nextSelectIndexRight, "left");
    if (idx === -1) {
        return;
    }
    setDragging(idx, true, "right");
    nextSelectIndexRight = (idx + 1) % points.length;
});

script.handTracking.onRightPinchUp.add(function() {
    for (var i = 0; i < points.length; i++) {
        if (points[i].draggingSource === "right") {
            setDragging(i, false, null);
        }
    }
});

// Touch fallback: tap cycles selection; drag gestures would normally move, here we only provide feedback
script.touchEvents.blockDefaultTouches = true;
script.touchEvents.allowDoubleTap = true;

var nextTouchSelect = 0;
var touchToPoint = {};

script.touchEvents.onTouchDown.add(function(touchId, touchX, touchY) {
    var key = String(touchId);
    // Pick a point in round-robin that isn't currently dragged by hands or another touch
    var chosen = -1;
    for (var i = 0; i < points.length; i++) {
        var idx = (nextTouchSelect + i) % points.length;
        if (points[idx].draggingSource === null) {
            chosen = idx;
            break;
        }
    }
    if (chosen === -1) {
        return;
    }
    touchToPoint[key] = chosen;
    setDragging(chosen, true, "touch:" + key);
    nextTouchSelect = (chosen + 1) % points.length;
});

script.touchEvents.onTouchMove.add(function(touchId, touchX, touchY) {
    // Normally we would update 3D position here, but 3D Object Upper Body API does not expose transform.
    // Keeping feedback active during move.
    var key = String(touchId);
    var idx = touchToPoint[key];
    if (idx === undefined) {
        return;
    }
    // No-op for position due to API limitation.
});

script.touchEvents.onTouchUp.add(function(touchId, touchX, touchY) {
    var key = String(touchId);
    var idx = touchToPoint[key];
    if (idx === undefined) {
        return;
    }
    setDragging(idx, false, null);
    delete touchToPoint[key];
});

// Keep a lightweight update loop in case future dynamic behaviors are needed
var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(function() {
    // No per-frame movement possible without position access.
});

} catch(e) {
  print("error in controller");
  print(e);
}
