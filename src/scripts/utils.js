(function (TM) {
    TM.toRadians = function toRadians(angle) {
        return angle * Math.PI / 180;
    };
    TM.screenToNdc = function screenToNdc(v) {
        var ndc = new THREE.Vector2().copy(v);
        ndc.x *= 2;
        ndc.y *= 2;
        ndc.x -= 1;
        ndc.y -= 1;
        ndc.y *= -1;
        return ndc;
    };
})(window.TM = window.TM || {});