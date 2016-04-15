(function (TM) {
    TM.Renderer = function TMRenderer() {
        THREE.WebG
    };
    TM.Renderer.prototype = THREE.WebGLRenderer;
})(window.TM = window.TM || {});