//Planet simulator
class Planet{
	constructor(base, atmosphere){
		this.base = base;
		this.atmosphere = atmosphere;
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
var cameraMaxDistance = 550;

var skybox;

var planets = [];
var current = 0;//which planet am i looking at
'use strict';
Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';
function fillScene() {

	scene = new Physijs.Scene();
	//scene.setGravity(new THREE.Vector3( 0,-200, 0 ));
	//scene.add( new THREE.AmbientLight( 0x222222, lightConstant/5 ) );

	//Sunlight
	var light = new THREE.PointLight( 0xffffff, lightConstant*2, 3000, 2 );
	light.position.set( 500, planetRadius, 1000 );
	light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 2500;
    light.shadow.camera.left = -1000;
    light.shadow.camera.right = 1000;
    light.shadow.camera.top = 1000;
    light.shadow.camera.bottom = -1000;

	scene.add( light );



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
	var earth1 = drawPlanet({ x:0, y:0, z:0, radius:planetRadius, folder:'earth', atmosphere:true });
	planets.push(earth1);
	scene.add(planets[0].base);
	var earth2 = drawPlanet({ x:20, y:0, z:0, radius:planetRadius, folder:'earth', atmosphere:true });
	planets.push(earth2);
	scene.add(planets[1].base);
}
function drawSkyBox(){
	var geometry = new THREE.CubeGeometry(4000,4000,4000);

	var sides = [
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/posx.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/negx.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/posy.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/negy.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/posz.jpg"), side: THREE.DoubleSide}),
		new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("Textures/SkyBox/negz.jpg"), side: THREE.DoubleSide})
	];
	var material = new THREE.MeshFaceMaterial( sides );

 	skybox = new THREE.Mesh(geometry, material);
	scene.add(skybox);
}

function drawPlanet({x,y,z, radius, folder, atmosphere}) {
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
	if(atmosphere){
		cloudMesh = makeAtmosphere({radius:radius*1.015, folder:folder});
		planetMesh.add(cloudMesh);
		var planet = new Planet(planetMesh, cloudMesh);
	}else{
		var planet = new Planet(planetMesh, null);
	}

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

function drawDeathstar(){
	var dSGeometry = new THREE.SphereGeometry(planetRadius/4,32,32);
	var dSMaterial = new THREE.MeshPhongMaterial();

}

function init() {
	var canvasWidth = 1280;
	var canvasHeight = 720;
	var canvasRatio = canvasWidth / canvasHeight;

	// Set up a renderer. This will allow WebGL to make your scene appear
	renderer = new THREE.WebGLRenderer( { antialias: true } );

	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setSize(canvasWidth, canvasHeight);
	renderer.setClearColor( 0xAAAAAA, 1.0 );

	// You also want a camera. The camera has a default position, but you most likely want to change this.
	// You'll also want to allow a viewpoint that is reminiscent of using the machine as described in the pdf
	// This might include a different position and/or a different field of view etc.
	camera = new THREE.PerspectiveCamera( 45, canvasRatio, 1, 4000 );
	// Moving the camera with the mouse is simple enough - so this is provided. However, note that by default,
	// the keyboard moves the viewpoint as well
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set( 25, planetRadius, 25);
	cameraControls.target.set(0, planetRadius, 0);
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
