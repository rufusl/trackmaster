(function (TM) {
    var Camera = THREE.PerspectiveCamera;

    // global constants
	var windowSize = new THREE.Vector2(window.innerWidth, window.innerHeight);
	var fovv = 70;
	var pointTimeStep = 1/2;
	var initialLength = 10;
	var cameraOffset = new THREE.Vector3(0, 0.6, 0);
	var cameraLookatOffset = new THREE.Vector3(0, 0.5, 0);
	var cameraLookatLookAhead = 0.5;
	var cameraSpeed = 1;

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
        function extendTrack(to) {
            // // DEBUG
            // (function() {
            //     var pointer = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), to, 1, 0xffff00);
            //     scene.add(pointer);
            // })();
            // gamestate.points.vertices.push(to);
            // return;
            // //


            var trackWidth = 0.5;
            var maxPoints = 250;

            if (lastPoint && to.distanceTo(lastPoint) < 0.05) {
                return;
            }
            lastPoint = to.clone();

	        var ps = gamestate.points.vertices;
	        var tangents = gamestate.points.tangents;
	        var normals = gamestate.points.normals;
	        var binormals = gamestate.points.binormals;

	        function create_frame(tang) {
		        var defaultNorm = new THREE.Vector3(1,0,0);
		        var otherNorm = new THREE.Vector3(0,0,1);
		        var linearDep = function(a, b) {
			        var s = a.x/b.x;
			        for (var j = 1; j < 3; ++j) {
				        var s0 = a.getComponent(j) / b.getComponent(j);
				        if (s - s0 > 0.001) {
					        return false;
				        }
			        }
			        return true;
		        };
		        var norm = defaultNorm;
		        if (linearDep(norm, tang)) {
			        norm = otherNorm;
		        }
		        var binorm = new THREE.Vector3().copy(norm).cross(tang);
		        //calc correct norm
	            norm = new THREE.Vector3().copy(binorm).cross(tang);
		        return { normal: norm, binormal: binorm };
	        }

	        //last cur point:
	        var ilast = ps.length-1;
	        var tang = to.clone().sub(ps[ilast-1]).normalize();
	        var frame = create_frame(tang);
	        tangents[ilast] = tang;
	        binormals[ilast] = frame.binormal;
	        normals[ilast] = frame.normal;

	        //new point
	        tang = to.clone().sub(_.last(ps)).normalize();
	        frame = create_frame(tang);
	        tangents.push(tang);
	        normals.push(frame.normal);
	        binormals.push(frame.binormal);
	        ps.push(to);



            // if (gamestate.points.vertices.length === 1) {
            //     return;
            // }
            // if (gamestate.points.vertices.length > maxPoints) {
            //     gamestate.points.vertices.splice(0, gamestate.points.vertices.length - maxPoints / 2);
            //     gamestate.points.binormals.splice(0, gamestate.points.binormals.length - maxPoints / 2);
            //}

            var i;
            var points = [
                new THREE.Vector2(-trackWidth * 0.5, -0.05),
                new THREE.Vector2(-trackWidth * 0.5, 0.05),
                new THREE.Vector2(trackWidth * 0.5, 0.05),
                new THREE.Vector2(trackWidth * 0.5, -0.05)
            ];

            var frames = {
	            tangents: tangents,
	            normals: normals,
	            binormals: binormals
            };

            var extrudeSettings = {
                amount: 0.1,
	            extrudePath: new THREE.CatmullRomCurve3(gamestate.points.vertices),
                steps: gamestate.points.vertices.length - 1,
                frames: frames,
                //curveSegments: 1,
                bevelEnabled: false,
                bevelSegments: 2,
                bevelSize: 0.1,
                bevelThickness: 0.1
            };
            var geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points), extrudeSettings);

            if (trackMesh) {
                trackRoot.remove(trackMesh);
            }
            trackMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                //map: new THREE.TextureLoader().load('../assets/textures/crate.gif'),
                wireframe: true
            }));

	        trackRoot.add(trackMesh);

	        (function() {
		        var pointer = new THREE.ArrowHelper(_.last(gamestate.points.binormals), _.last(gamestate.points.vertices), 1, 0xffff00);
		        scene.add(pointer);
            })();

        }

        function update(td) {

            var i;
            var relScreenPos = new THREE.Vector2().copy(input.screenPosition).divide(windowSize);
	        relScreenPos = TM.screenToNdc(relScreenPos);
	        relScreenPos.multiply(
		        new THREE.Vector2(
                    Math.tan(TM.toRadians(fovh / 2))
	                , Math.tan(TM.toRadians(fovv / 2))
                )
            );
	        var planePos = new THREE.Vector3(relScreenPos.x, relScreenPos.y, -1)
	        //for debug
		            .multiplyScalar(5);
            planePos.applyMatrix4(camera.matrixWorld);

	        pointer.position.copy(planePos);


	        gamestate.update(td);
            if (gamestate.lastPointTime > pointTimeStep) {
                //planePos.setX(THREE.Math.clamp(planePos.x, -1, 1));
                //planePos.setY(THREE.Math.clamp(planePos.y, -1, -0.2));
                var last = gamestate.points.vertices[gamestate.points.vertices.length-1];
                var fromLast = new THREE.Vector3().copy(planePos).sub(last);
                var mousePlaneDepth = cameraSpeed * gamestate.lastPointTime;
                fromLast.normalize().multiplyScalar(mousePlaneDepth);
                //planePos = new THREE.Vector3(planePos.x, planePos.y, -mousePlaneDepth - trackRoot.position.z);
                //planePos.setZ(planePos.z + 0.5 * td);

                // gamestate.resetLastPointClock();
	            gamestate.lastPointTime = 0;
		        extendTrack(fromLast.add(last));
            //     gamestate.points.vertices.push(planePos);
            //     //TODO: use td, might cause slight drift
            //
            //     var vs = gamestate.points.vertices;
            //     var geo = new THREE.Geometry();
            //     geo.vertices = [
            //         vs[vs.length - 2]
            //         , vs[vs.length - 1]
            //     ];
            //     var curve = new THREE.Line(geo, material);
            //     scene.add(curve);
	        }

	        //camera.translateZ(-cameraSpeed * td * 1/2);

            var cameraPos = gamestate.points.at(gamestate.cameraDist);
            camera.position.copy(cameraPos).add(cameraOffset);
            gamestate.cameraDist += cameraSpeed * td;
            // camera.up = cameraPos.binormal;
            camera.lookAt(gamestate.points.at(gamestate.cameraDist + cameraLookatLookAhead).add(cameraLookatOffset));

            env.updateCamera(camera);

	        renderer.render(env.scene, env.camera);
            renderer.render(scene, camera);

        }

        return {
            update: update
        };
    }

    function Lines(vertices) {
	    this.vertices = vertices || [];
	    this.tangents = [];
	    this.normals = [];
        this.binormals = [];
        this.vertices.last = function() { return this[this.length-1]; };
        this.at = function(x) {
            var vs = this.vertices;
            for (var i = 0; i + 1 < vs.length; ++i) {
                var line = new THREE.Line3(vs[i], vs[i+1]);
                var len = line.distance();
                if (len > x) {
                    var t = x/len;
                    var result = line.at(t);
                    result.binormal = this.binormals[i].clone().lerp(this.binormals[i+1], t);
                    result.normal = this.normals[i].clone().lerp(this.normals[i+1], t);
                    return result;
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
        //this.resetLastPointClock = function() {
        //    this.lastPointClock = new THREE.Clock(true);
        //};
	    //this.lastPointClock = new THREE.Clock(false);
	    this.lastPointTime = 0;

	    this.update = function(td) {
		    this.lastPointTime += td;
	    };

        this.points = new Lines([
            new THREE.Vector3(0, 0, 0)
	        , new THREE.Vector3(0, 0, -cameraSpeed)
        ]);
        this.points.tangents = [
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0, 0, -1)
        ];
        this.points.binormals = [
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 1, 0)
        ];
        this.points.normals = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(1, 0, 0)
        ];
        this.cameraDist = 0.0;
    }
})(window.TM = window.TM || {});
