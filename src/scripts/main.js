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
        var material = new THREE.LineBasicMaterial( { color : 0xffdd00, linewidth: 4 } );
        var gamestate = new Gamestate();
        var env = new Env();
        gamestate.lastPointClock.start();
        var fovh = fovv * camera.aspect;

        // initial segment
        (function() {
            var geo = new THREE.Geometry();
            geo.vertices = gamestate.points.vertices;
            var curve = new THREE.Line(geo, material);
            scene.add(curve);
        })();

        var pointer = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0,0,0), 1, 0xffff00);
        scene.add(pointer);

        var trackRoot = new THREE.Object3D();
        scene.add(trackRoot);

        var trackMesh = null;
        var lastPoint = null;
        var useExtrudePath = false;
        function extendTrack(to) {
            var trackWidth = 0.5;
            var maxPoints = 250;

            if (lastPoint && to.distanceTo(lastPoint) < 0.05) {
                return;
            }
            lastPoint = to.clone();
            gamestate.points.vertices.push(to);
            if (gamestate.points.vertices.length === 1) {
                return;
            }
            if (gamestate.points.vertices.length > maxPoints) {
                gamestate.points.vertices.splice(0, gamestate.points.vertices.length - maxPoints / 2);
            }

            var i;
            var points = [];
            if (useExtrudePath) {
                points = [
                    new THREE.Vector2(-trackWidth * 0.5, -0.05),
                    new THREE.Vector2(-trackWidth * 0.5, 0.05),
                    new THREE.Vector2(trackWidth * 0.5, 0.05),
                    new THREE.Vector2(trackWidth * 0.5, -0.05)
                ]
            }
            else {
                for (i = 0; i < gamestate.points.vertices.length; i++) {
                    points.push(new THREE.Vector2(gamestate.points.vertices[i].x - trackWidth * 0.5, -gamestate.points.vertices[i].z));
                }
                for (i = points.length - 1; i >= 0; i--) {
                    points.push(new THREE.Vector2(points[i].x + trackWidth, points[i].y));
                }
            }

            var extrudeSettings = {
                amount: 0.1,
                steps: 1,
                //curveSegments: 1,
                bevelEnabled: false,
                bevelSegments: 2,
                bevelSize: 0.1,
                bevelThickness: 0.1
            };
            if (useExtrudePath) {
                extrudeSettings.extrudePath =  new THREE.CatmullRomCurve3(gamestate.points.vertices);
                extrudeSettings.steps = gamestate.points.vertices.length;
            }
            var geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points), extrudeSettings);

            if (trackMesh) {
                trackRoot.remove(trackMesh);
            }
            trackMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                //map: new THREE.TextureLoader().load('../assets/textures/crate.gif'),
                wireframe: true
            }));
            if (!useExtrudePath) {
                trackMesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI * 0.5);
                trackMesh.position.set(0, -0.4, -0.6);
            }
            trackRoot.add(trackMesh);
        }

        function update(td) {
            var i;
            var relScreenPos = new THREE.Vector2().copy(input.screenPosition).divide(windowSize);
            relScreenPos = TM.screenToNdc(relScreenPos);
            var planePos = (relScreenPos.multiply(
                new THREE.Vector2(
                    Math.tan(TM.toRadians(fovh / 2))
                    , Math.tan(TM.toRadians(fovv / 2))
                ).multiplyScalar(mousePlaneDepth)
            ));

            planePos.setX(THREE.Math.clamp(planePos.x, -1, 1));
            planePos.setY(THREE.Math.clamp(planePos.y, -1, -0.2));
            planePos = new THREE.Vector3(planePos.x, planePos.y, -mousePlaneDepth - trackRoot.position.z);
            planePos.applyMatrix4(camera.matrixWorld);
            planePos.setZ(planePos.z + 0.5 * td);

            //pointer.position.copy(planePos);

            extendTrack(planePos);

            camera.translateZ(-0.5 * td);

            // camera.position.copy(gamestate.points.at(gamestate.cameraDist)).add(cameraOffset);
            // gamestate.cameraDist += cameraSpeed * td;
            // camera.lookAt(gamestate.points.at(gamestate.cameraDist + cameraLookatLookAhead).add(cameraLookatOffset));

            // env.updateCamera(camera);

            //renderer.render(env.scene, env.camera);
            renderer.render(scene, camera);

            // if (gamestate.lastPointClock.getElapsedTime() > pointTimeStep) {
            //     gamestate.points.vertices.push(planePos);
            //     //TODO: use td, might cause slight drift
            //     gamestate.resetLastPointClock();
            //
            //     var vs = gamestate.points.vertices;
            //     var geo = new THREE.Geometry();
            //     geo.vertices = [
            //         vs[vs.length - 2]
            //         , vs[vs.length - 1]
            //     ];
            //     var curve = new THREE.Line(geo, material);
            //     scene.add(curve);
            // }
        }

        return {
            update: update
        };
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
