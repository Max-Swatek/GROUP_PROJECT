//Planet simulator
'user strict'

class Planet{
	constructor(base, atmosphere, rings){
		this.base = base;
		this.atmosphere = atmosphere;
		this.rings = rings;
	}
}
var camera, scene, renderer;
var cameraControls;
var clock = new THREE.Clock();

var planetMesh;
var cloudMesh;

var lightConstant = 1.5;
var planetRadius = 1;

var cameraMinDistance = planetRadius*2.5;
var cameraMaxDistance = 5000;

var skybox;

var planets = [];
var current = 0;//which planet am i looking at

//Texture loader
var textureLoader = new THREE.TextureLoader();

//Lens flare
var textureFlare0 = textureLoader.load( "/Textures/lensflare/lensflare0.png" );
var textureFlare2 = textureLoader.load( "/Textures/lensflare/lensflare2.png" );
var textureFlare3 = textureLoader.load( "/Textures/lensflare/lensflare3.png" );

Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';
function fillScene() {

	scene = new Physijs.Scene();
	//scene.setGravity(new THREE.Vector3( 0,-200, 0 ));
	//scene.add( new THREE.AmbientLight( 0x222222, lightConstant/5 ) );


	addLight(.8, 1, 1, 0, 0, 0);

	//Visualize the Axes - Useful for debugging, can turn this off if desired
 	//A simple grid floor, the variables hint at the plane that this lies within
	// Later on we might install new flooring.
 // 	var gridXZ = new THREE.GridHelper(2000, 100, new THREE.Color(0xCCCCCC), new THREE.Color(0x888888));
 // 	//scene.add(gridXZ);
	// var axes = new THREE.AxisHelper(150);
 // axes.position.y = 1;
 // scene.add(axes);
	drawSkyBox();
	//drawEarth();
	var earth1 = drawPlanet({ x:500, y:0, z:1000, radius:planetRadius, folder:'ringly', atmosphere:true, rings:true });
	planets.push(earth1);
	scene.add(planets[0].base);
	var earth2 = drawPlanet({ x:550, y:0, z:1050, radius:planetRadius, folder:'earth', atmosphere:true });
	planets.push(earth2);
	scene.add(planets[1].base);
}

const addLight = (h, s, l, x, y, z ) => {

	var light = new THREE.PointLight( 0xffffff, lightConstant*2, 3000, 2 );
	light.color.setHSL( h, s, l)
	light.position.set( x, y, z );
	// light.castShadow = true;
    // light.shadow.camera.near = 0.1;
    // light.shadow.camera.far = 2500;
    // light.shadow.camera.left = -1000;
    // light.shadow.camera.right = 1000;
    // light.shadow.camera.top = 1000;
    // light.shadow.camera.bottom = -1000;

	scene.add( light );

	//light helper.  Edit out later
	// const plh = new THREE.PointLightHelper(light);
	//scene.add(plh);

	var flareColor = new THREE.Color( 0xffffff );
	flareColor.setHSL( h, s, l + 0.5 );

	const lensFlare = new THREE.LensFlare( textureFlare0, 1500, 0.0, THREE.AdditiveBlending, flareColor);
	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 60, 0.6, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 70, 0.7, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 120, 0.9, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 70, 1.0, THREE.AdditiveBlending );

	lensFlare.position.copy( light.position );

	scene.add( lensFlare );
}

function drawSkyBox(){
	var geometry = new THREE.CubeGeometry(10000,10000,10000);

	var sides = [
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/skybox_right1.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/skybox_left2.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/skybox_top3.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/skybox_bottom4.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/skybox_front5.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/skybox_back6.jpg"), side: THREE.DoubleSide})
	];
	var material = new THREE.MeshFaceMaterial( sides );

 	skybox = new THREE.Mesh(geometry, material);
	scene.add(skybox);
}

function drawPlanet({x,y,z, radius, folder, atmosphere, rings}) {
	var planetGeometry = new THREE.SphereGeometry(radius,32,32);
	var planetMaterial = new THREE.MeshPhongMaterial();
	planetMaterial.map = new THREE.TextureLoader().load(`/Textures/${folder}/map.jpg`);
	planetMaterial.bumpMap = new THREE.TextureLoader().load(`/Textures/${folder}/bump.jpg`);
	planetMaterial.bumpScale = radius;
	planetMaterial.specularMap = new THREE.TextureLoader().load(`/Textures/${folder}/spec.jpg`);
	planetMaterial.specular = new THREE.Color('grey');

	planetMesh = new THREE.Mesh(planetGeometry,planetMaterial);
	planetMesh.position.x = x;
	planetMesh.position.y = y+radius;
	planetMesh.position.z = z;

	let cloudMesh = null;
	let ringMesh = null;
	if(atmosphere){
		cloudMesh = makeAtmosphere({radius:radius*1.015, folder});
		planetMesh.add(cloudMesh);
	}

	if (rings) {
		ringMesh = makeRings({ radius, folder });
		planetMesh.add(ringMesh);
	}
	const planet = new Planet(planetMesh, cloudMesh, ringMesh);

	//scene.add(planetMesh);
	//var planet = new Planet(planetMesh, cloudMesh);
	//return planetMesh;
	return planet;
}

function makeAtmosphere({radius, folder}){

	var geometry = new THREE.SphereGeometry(radius, 32, 32);
	var material = new THREE.MeshPhongMaterial();
	material.map = new THREE.TextureLoader().load(`/Textures/${folder}/cloud.jpg`);
	material.alphaMap = new THREE.TextureLoader().load(`/Textures/${folder}/cloudtrans.jpg`);
	material.transparent = true;
	material.opacity = 0.6;
	material.depthWrite = false;
	material.side = THREE.DoubleSide;

	return new THREE.Mesh(geometry, material);
}

const makeRings = ({ radius, folder }) => {
	const segments = 100;
	const geometry = new THREE.XRingGeometry(1.2 * radius, 2 * radius, 2 * segments, 5, 0, Math.PI * 2);
	const material = new THREE.MeshBasicMaterial ();
	material.map = new THREE.TextureLoader().load(`/Textures/${folder}/rings.png`)
	material.transparent = true;
	material.opacity = 0.6;
	material.side = THREE.DoubleSide;

	return new THREE.Mesh(geometry, material);
}

function init() {
	const canvasWidth = window.innerWidth;
	const canvasHeight = window.innerHeight;

	var canvasRatio = canvasWidth / canvasHeight;

	// Set up a renderer. This will allow WebGL to make your scene appear
	renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );

	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setSize(canvasWidth, canvasHeight);
	renderer.setClearColor( 0xAAAAAA, 1.0 );

	// You also want a camera. The camera has a default position, but you most likely want to change this.
	// You'll also want to allow a viewpoint that is reminiscent of using the machine as described in the pdf
	// This might include a different position and/or a different field of view etc.
	camera = new THREE.PerspectiveCamera( 45, canvasRatio, 1, 16000 );
	// Moving the camera with the mouse is simple enough - so this is provided. However, note that by default,
	// the keyboard moves the viewpoint as well
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set( 600, planetRadius, 1100);
	cameraControls.target.set(500, planetRadius, 1000);
	cameraControls.minDistance = cameraMinDistance;
	cameraControls.maxDistance = cameraMaxDistance;
}

function addToDOM() {
    var canvas = document.getElementById('canvas');
    canvas.appendChild(renderer.domElement);
}

	// This is a browser callback for repainting
	// Since you might change view, or move things
	// We cant to update what appears
function animate() {
	window.requestAnimationFrame(animate);
	render();
}
function render() {
	scene.simulate();
	var delta = clock.getDelta();
	cameraControls.update(delta);
	renderer.render(scene, camera);
	skybox.position = camera.position;
	TWEEN.update();

		//rotate planet

  		planets[current].base.rotation.y  += 1/32 * delta;
  		planets[current].atmosphere.rotation.y  += 1/16 * delta;

}

function targetWorld(){
	current += 1;
	var index = current%planets.length
	cameraControls.target.set(planets[index].base.position.x, planets[index].base.position.y, planets[index].base.position.z);
	current = index;
}
document.onkeydown = function move(e) {
    switch (e.keyCode) {
        case 32:
            targetWorld();
        break;
    }


};

try {
  	init();
  	fillScene();
 	addToDOM();
  	animate();

} catch(error) {
    console.log("You did something bordering on utter madness. Error was:");
    console.log(error);
}
