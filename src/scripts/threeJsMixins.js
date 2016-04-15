(function ThreeJsMixins() {
    THREE.Vector2.multiplyScalar = function(x) { this.x *= x; this.y *= x; };
    THREE.Vector2.multiply = function(v) { this.x *= v.x; this.y *= v.y; };
    THREE.Vector2.divideScalar = function(x) { this.x /= x; this.y /= x; };
    THREE.Vector2.divide = function(v) { this.x /= v.x; this.y /= v.y; };
})();
