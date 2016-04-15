(function (TM) {
    TM.Input = function Input() {
        this.screenPosition = new THREE.Vector2(0, 0);
        var self = this;
        var onMouseMove = function (event) {
            self.screenPosition.x = event.x;
            self.screenPosition.y = event.y;
        };

        this.dispose = function () {
            document.removeEventListener('mousemove', onMouseMove, false);
        };
        document.addEventListener('mousemove', onMouseMove, false);
    };
})(window.TM = window.TM || {});