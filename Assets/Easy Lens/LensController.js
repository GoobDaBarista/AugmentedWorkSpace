// Main Controller
//
// Made with Easy Lens

//@input Component.ScriptComponent handTracking
//@input Component.ScriptComponent spriteManager
//@input Component.ScriptComponent spriteStore
//@input Component.ScriptComponent touchEvents


try {

// Draggable 4-point handles with Spectacles hand-tracking priority and touch fallback.
// Follows constraints: only dynamic property changes, correct event signatures, and provided block APIs.

const screenSize = script.spriteManager.getScreenSize();

// Create four point sprites
const points = [];
function makePoint(name, textureName, px, py, sizePixels) {
    const s = script.spriteManager.createSprite(name);
    s.texture = script.spriteStore.getTexture(textureName);
    s.size = new vec2(sizePixels, sizePixels);
    s.position = new vec2(px, py);
    s.stretchMode = StretchMode.Fit;
    s.data = {
        baseSize: sizePixels,
        isDragging: false,
        dragSource: null // "left","right","touch:<id>"
    };
    return s;
}

// Layout: corners-ish
points.push(makePoint("point1", "point1", screenSize.x * 0.3, screenSize.y * 0.3, Math.min(screenSize.x, screenSize.y) * 0.06));
points.push(makePoint("point2", "point2", screenSize.x * 0.7, screenSize.y * 0.3, Math.min(screenSize.x, screenSize.y) * 0.06));
points.push(makePoint("point3", "point3", screenSize.x * 0.3, screenSize.y * 0.7, Math.min(screenSize.x, screenSize.y) * 0.06));
points.push(makePoint("point4", "point4", screenSize.x * 0.7, screenSize.y * 0.7, Math.min(screenSize.x, screenSize.y) * 0.06));

// Utils
function setPointDragging(point, dragging, source) {
    point.data.isDragging = dragging;
    point.data.dragSource = dragging ? source : null;
    // Visual feedback: scale up when dragging
    const scaleMul = dragging ? 1.3 : 1.0;
    point.size = new vec2(point.data.baseSize * scaleMul, point.data.baseSize * scaleMul);
}

function findClosestPoint(pixelPos, maxDistPixels) {
    let best = null;
    let bestDistSq = maxDistPixels * maxDistPixels;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const pp = p.position;
        const dx = pp.x - pixelPos.x;
        const dy = pp.y - pixelPos.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= bestDistSq) {
            best = p;
            bestDistSq = d2;
        }
    }
    return best;
}

// Hand tracking interaction
// Use pinch for initiating dragging, move with index fingertip while pinched.
// Release on pinch up.
// Use index3 joint (fingertip) 2D screenspace mapped to pixels.
const grabRadius = Math.min(screenSize.x, screenSize.y) * 0.08;

function moveDraggedFromHand(handId, joint2D) {
    // handId: "left" | "right"
    const pixel = script.spriteManager.unitToPixel(new vec2(joint2D.x, joint2D.y));
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.data.isDragging && p.data.dragSource === handId) {
            p.position = new vec2(pixel.x, pixel.y);
        }
    }
}

// Begin drag on pinch down near a point
script.handTracking.onLeftPinchDown.add(function() {
    // We need fingertip position; take it from latest tracking frame via onLeftTracking cache
    // If we don't have a cached frame yet, we cannot start a grab.
    if (!lastLeftData) {
        return;
    }
    const tip = lastLeftData.joints.index3.position2D;
    const tipPixel = script.spriteManager.unitToPixel(new vec2(tip.x, tip.y));
    const target = findClosestPoint(tipPixel, grabRadius);
    if (!target) {
        return;
    }
    setPointDragging(target, true, "left");
});

script.handTracking.onRightPinchDown.add(function() {
    if (!lastRightData) {
        return;
    }
    const tip = lastRightData.joints.index3.position2D;
    const tipPixel = script.spriteManager.unitToPixel(new vec2(tip.x, tip.y));
    const target = findClosestPoint(tipPixel, grabRadius);
    if (!target) {
        return;
    }
    setPointDragging(target, true, "right");
});

// Release on pinch up
script.handTracking.onLeftPinchUp.add(function() {
    for (let i = 0; i < points.length; i++) {
        if (points[i].data.isDragging && points[i].data.dragSource === "left") {
            setPointDragging(points[i], false, null);
        }
    }
});

script.handTracking.onRightPinchUp.add(function() {
    for (let i = 0; i < points.length; i++) {
        if (points[i].data.isDragging && points[i].data.dragSource === "right") {
            setPointDragging(points[i], false, null);
        }
    }
});

// Cache last tracking frames to access joint positions inside gesture events
let lastLeftData = null;
let lastRightData = null;

script.handTracking.onLeftTracking.add(function(data) {
    lastLeftData = data;
    // While dragging with left hand, update point to index tip
    const tip = data.joints.index3.position2D;
    moveDraggedFromHand("left", tip);
});

script.handTracking.onRightTracking.add(function(data) {
    lastRightData = data;
    const tip = data.joints.index3.position2D;
    moveDraggedFromHand("right", tip);
});

// Touch fallback: drag with finger. Block default touches for smooth drag UX on mobile.
script.touchEvents.blockDefaultTouches = true;

// Maintain mapping touchId -> dragged point
const touchToPoint = {};

script.touchEvents.onTouchDown.add(function(touchId, touchX, touchY) {
    const pixel = script.spriteManager.unitToPixel(new vec2(touchX, touchY));
    // Prefer direct hit on sprite bounds; fallback to proximity search
    const hitList = script.spriteManager.hitTest(pixel);
    let target = null;
    if (hitList && hitList.length > 0) {
        target = hitList[0];
    } else {
        target = findClosestPoint(pixel, grabRadius);
    }
    if (!target) {
        return;
    }
    // If already dragged by a hand, ignore this touch
    if (target.data.isDragging && (target.data.dragSource === "left" || target.data.dragSource === "right")) {
        return;
    }
    setPointDragging(target, true, "touch:" + String(touchId));
    touchToPoint[String(touchId)] = target;
});

script.touchEvents.onTouchMove.add(function(touchId, touchX, touchY) {
    const key = String(touchId);
    const point = touchToPoint[key];
    if (!point) {
        return;
    }
    const pixel = script.spriteManager.unitToPixel(new vec2(touchX, touchY));
    point.position = new vec2(pixel.x, pixel.y);
});

script.touchEvents.onTouchUp.add(function(touchId, touchX, touchY) {
    const key = String(touchId);
    const point = touchToPoint[key];
    if (!point) {
        return;
    }
    setPointDragging(point, false, null);
    delete touchToPoint[key];
});

// Publicly accessible positions for other scripts (updated each frame)
let pointPositions = [
    new vec2(points[0].position.x, points[0].position.y),
    new vec2(points[1].position.x, points[1].position.y),
    new vec2(points[2].position.x, points[2].position.y),
    new vec2(points[3].position.x, points[3].position.y)
];

// Update loop to keep exported positions current
const updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(function() {
    for (let i = 0; i < points.length; i++) {
        const p = points[i].position;
        pointPositions[i] = new vec2(p.x, p.y);
    }
});

} catch(e) {
  print("error in controller");
  print(e);
}
