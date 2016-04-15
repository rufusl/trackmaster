(function (TM) {
    var Camera = THREE.PerspectiveCamera;

    // global constants
	var windowSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
	var fovv = 70;
	var pointTimeStep = 1/3;
	var initialLength = 1;
	var cameraOffset = new THREE.Vector3(0, 0.1, 0);
	var cameraLookatOffset = new THREE.Vector3(0, 0.1, 0);
	var cameraLookatLookAhead = 1;
	var cameraSpeed = 1/3;
	var mousePlaneDepth = initialLength + cameraSpeed * pointTimeStep;

    main();

    // global variables, initialized in init()
	var camera,
        scene,
        renderer,
        input;
    function init() {
        camera = new Camera(fovv, windowSize.x / windowSize.y, 0.01, 1000);
        scene = new THREE.Scene();

        renderer = new THREE.WebGLRenderer();
        renderer.autoClear = false;
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        window.addEventListener('resize', function onWindowResize() {
            windowSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, false);

        input = new TM.Input();
    }

    function main() {
        init();
        var game = new Game();
        var clock = new THREE.Clock(true);
        gameLoop();

        function gameLoop() {
            game.update(clock.getDelta());
            requestAnimationFrame(gameLoop);
        }
    }

    function Game() {
        // initial game setup
        var mesh;
        var point;
        var material = new THREE.LineBasicMaterial( { color : 0xffdd00, linewidth: 4 } );
        var gamestate = new Gamestate();
        var env = new Env();
        gamestate.lastPointClock.start();

        // initial segment
        var geo = new THREE.Geometry();
        geo.vertices = gamestate.points.vertices;
        var curve = new THREE.Line(geo, material);
        scene.add(curve);

        return {
            update: update
        };

        function update(td) {
            var i;
            var relScreenPos = new THREE.Vector2().copy(input.screenPosition).divide(windowSize);
            relScreenPos = TM.screenToNdc(relScreenPos);

            var fovh = fovv * camera.aspect;
            var planePos = (relScreenPos.multiply(
                new THREE.Vector2(
                    Math.tan(TM.toRadians(fovh / 2))
                    , Math.tan(TM.toRadians(fovv / 2))
                ).multiplyScalar(mousePlaneDepth)
            ));
            planePos = new THREE.Vector3(planePos.x, planePos.y, -mousePlaneDepth);
            planePos.applyMatrix4(camera.matrixWorld);
            //planePos.add(camera.position);

            if (point) {
                scene.remove(point);
            }
            point = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), planePos, 1, 0xffff00);
            scene.add(point);

            camera.position.copy(gamestate.points.at(gamestate.cameraDist)).add(cameraOffset);
            gamestate.cameraDist += cameraSpeed * td;
            camera.lookAt(gamestate.points.at(gamestate.cameraDist + cameraLookatLookAhead).add(cameraLookatOffset));

            var pprev = gamestate.points[gamestate.isegmentcur];
            var linecur = new THREE.Line3(pprev, planePos);

            //var linelen = linecur.distance();

            if (mesh) {
                for (i = 0; i < mesh.length; ++i) {
                    scene.remove(mesh[i]);
                }
            }
            mesh = [];

            var geometry = new THREE.Geometry();
            //geometry.vertices = gamestate.points;
            geometry.vertices = [gamestate.points.vertices.last(), planePos];
            var o = new THREE.Line(geometry, material);
            mesh.push(o);
            for (i = 0; i < mesh.length; ++i) {
                scene.add(mesh[i]);
            }

            env.updateCamera(camera);

            renderer.render(env.scene, env.camera);
            renderer.render(scene, camera);

            if (gamestate.lastPointClock.getElapsedTime() > pointTimeStep) {
                gamestate.points.vertices.push(planePos);
                //TODO: use td, might cause slight drift
                gamestate.resetLastPointClock();

                var vs = gamestate.points.vertices;
                var geo = new THREE.Geometry();
                geo.vertices = [
                    vs[vs.length - 2]
                    , vs[vs.length - 1]
                ];
                var curve = new THREE.Line(geo, material);
                scene.add(curve);
            }
        }
    }

    function Lines(vertices) {
        this.vertices = vertices || [];
        this.vertices.last = function() { return this[this.length-1]; };
        this.at = function(x) {
            var vs = this.vertices;
            for (var i = 0; i + 1 < vs.length; ++i) {
                var line = new THREE.Line3(vs[i], vs[i+1]);
                var len = line.distance();
                if (len > x) {
                    return line.at(x/len);
                }
                x -= len;
            }
            return new THREE.Vector3().copy(vs[vs.length-1]);
        };
    }

    function Env() {
        this.camera = new Camera(fovv, windowSize.x / windowSize.y, 1, 20000);
        this.scene = new THREE.Scene();

        var r = "assets/textures/cube/Bridge2/";
        var urls = [ "posx", "negx",
            "posy", "negy",
            "posz", "negz" ].map(function(n) {
            return r + n + ".jpg";
        });
        var textureCube = new THREE.CubeTextureLoader().load( urls );
        textureCube.format = THREE.RGBFormat;
        textureCube.mapping = THREE.CubeReflectionMapping;

        var cubeShader = THREE.ShaderLib[ "cube" ];
        var cubeMaterial = new THREE.ShaderMaterial( {
            fragmentShader: cubeShader.fragmentShader,
            vertexShader: cubeShader.vertexShader,
            uniforms: cubeShader.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        } );
        cubeMaterial.uniforms[ "tCube" ].value = textureCube;
        // Skybox
        var cubeMesh = new THREE.Mesh( new THREE.BoxGeometry( 100, 100, 100 ), cubeMaterial );
        this.scene.add(cubeMesh);

        this.updateCamera = function(cam) {
            this.camera.aspect = cam.aspect;
            this.camera.fov = cam.fov;
            this.camera.rotation.copy(cam.rotation);
        };
    }

    function Gamestate() {
        this.resetLastPointClock = function() {
            this.lastPointClock = new THREE.Clock(true);
        };
        this.lastPointClock = new THREE.Clock(false);

        this.points = new Lines([
            new THREE.Vector3(0, 0, 0)
            , new THREE.Vector3(0, 0, -initialLength)
        ]);
        this.cameraDist = 0.0;
    }
})(window.TM = window.TM || {});
