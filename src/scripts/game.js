(function () {
	THREE.Vector2.multiplyScalar = function(x) { this.x *= x; this.y *= x; }
	THREE.Vector2.multiply = function(v) { this.x *= v.x; this.y *= v.y; }
	THREE.Vector2.divideScalar = function(x) { this.x /= x; this.y /= x; }
	THREE.Vector2.divide = function(v) { this.x /= v.x; this.y /= v.y; }
	var radians = function(angle) { return angle * Math.PI / 180; };

	var Input = function() {
		this.screenPosition = new THREE.Vector2(0, 0);
		var self = this;
		var onMouseMove = function(event) {
			self.screenPosition.x = event.x;
			self.screenPosition.y = event.y;
		};
		
		this.dispose = function() {
			document.removeEventListener( 'mousemove', onMouseMove, false );
		}
		document.addEventListener( 'mousemove', onMouseMove, false );
	};

	var windowSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
	var fovv = 70;
	var mousePlaneDepth = 10;

    var camera, scene, renderer;
	var mesh;
	var point;
	var material = new THREE.LineBasicMaterial( { color : 0xffdd00, linewidth: 4 } );
	var input = new Input();
    init();
    animate();
	function init() {
        camera = new THREE.PerspectiveCamera(fovv, windowSize.x / windowSize.y, 0.01, 1000);
        camera.position.x = 0;
        camera.position.y = 0;
		camera.position.z = 0;

        scene = new THREE.Scene();
        var texture = new THREE.TextureLoader().load('../assets/textures/crate.gif');
        var geometry = new THREE.BoxBufferGeometry(200, 200, 200);
        mesh = new THREE.Mesh(geometry, material);
		//scene.add(mesh);

        renderer = new THREE.WebGLRenderer();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        window.addEventListener('resize', onWindowResize, false);
    }

    function onWindowResize() {
	    windowSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

	function screenToNdc(v) {
		var ndc = new THREE.Vector2().copy(v);
	    ndc.x *= 2;
		ndc.y *= 2;
	    ndc.x -= 1;
	    ndc.y -= 1;
		ndc.y *= -1;
		return ndc;
	};

    function animate() {
        requestAnimationFrame(animate);

	    var relScreenPos = new THREE.Vector2().copy(input.screenPosition).divide(windowSize);
	    relScreenPos = screenToNdc(relScreenPos);

	    var fovh = fovv * camera.aspect;
	    var planePos = (relScreenPos.multiply(
		    new THREE.Vector2(
			      Math.tan(radians(fovh/2))
			    , Math.tan(radians(fovv/2))
		    ).multiplyScalar(mousePlaneDepth)
	    ));
	    planePos = new THREE.Vector3(planePos.x, planePos.y, -mousePlaneDepth)
	    planePos.add(camera.position);

	    if (point) {
		    scene.remove(point);
	    }
	    point = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), planePos, 1, 0xffff00);
	    scene.add(point);

	    var curve = new THREE.QuadraticBezierCurve3(
		    new THREE.Vector3(0, -1, 0).add(camera.position),
		    new THREE.Vector3(0, -1, -mousePlaneDepth).add(camera.position),
		    planePos
	    );


	    if (mesh) {
		    for (var i = 0; i < mesh.length; ++i) {
			    scene.remove(mesh[i]);
		    }
	    }

	    var geometry = new THREE.Geometry();
	    geometry.vertices = curve.getPoints( 50 );
	    //geometry.vertices = [new THREE.Vector3(0, -1, 0).add(camera.position), planePos];
	    var o = new THREE.Line( geometry, material );
	    mesh = [];
	    mesh.push(o);
	    for (var i = 0; i < mesh.length; ++i) {
		    scene.add(o);
	    }


        renderer.render(scene, camera);
    }
})();
