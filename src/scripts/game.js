(function () {
	var radians = function(angle) { return angle * Math.PI / 180; };

	var mousePosition = new THREE.Vector2(0, 0);
	var initMouseControls = function() {
		var onMouseMove = function(event) {
			mousePosition.x = event.x;
			mousePosition.y = event.y;
		};

		this.dispose = function() {
			document.removeEventListener( 'mousemove', onMouseMove, false );
		}
		document.addEventListener( 'mousemove', onMouseMove, false );
	};

	var windowSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
	var fovv = 70;
	var mousePlaneDepth = 1;

    var camera, scene, renderer;
	var mesh;
	var point;
	initMouseControls();
    init();
    animate();
	function init() {
        camera = new THREE.PerspectiveCamera(fovv, windowSize.x / windowSize.y, 1, 1000);
        camera.position.x = 0;
        camera.position.y = 0;
		camera.position.z = 0;

        scene = new THREE.Scene();
        var texture = new THREE.TextureLoader().load('../assets/textures/crate.gif');
        var geometry = new THREE.BoxBufferGeometry(200, 200, 200);
        var material = new THREE.MeshBasicMaterial({map: texture});
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

    function animate() {
        requestAnimationFrame(animate);
        mesh.rotation.x += 0.005;
	    mesh.rotation.y += 0.01;

	    var relMousePos = new THREE.Vector3(
		    mousePosition.x / windowSize.x
		    , mousePosition.y / windowSize.y
		    , 0
	    );

	    relMousePos.x *= 2;
	    relMousePos.y *= 2;

	    relMousePos.x -= 1;
	    relMousePos.y -= 1;

	    relMousePos.y *= -1;

	    var fovh = fovv * camera.aspect;


	    var planePos = (relMousePos.multiply(
		    new THREE.Vector3(
			    Math.tan(radians(fovh/2))
			    , Math.tan(radians(fovv/2))
			    , 0
		    )
	    ));
	    planePos.add(camera.position);
	    planePos.z -= mousePlaneDepth;

	    console.log(planePos);

	    if (point) {
		    scene.remove(point);
	    }
	    point = new THREE.BoxHelper(new THREE.ArrowHelper(new THREE.Vector3(0.1, 0.2, 1), planePos, 1, 0xffff00));
	    scene.add(point);


        renderer.render(scene, camera);
    }
})();
