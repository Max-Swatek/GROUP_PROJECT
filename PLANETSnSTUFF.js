//Planet simulator
'user strict'

class Planet{
	constructor({base, atmosphere, rings}){
		this.base = base;
		this.atmosphere = atmosphere;
		this.rings = rings;
		// this.moons = [];
	}
	addMoon(moon){
		// moons.push(moon);
	}
	animate(delta){
		this.base.rotation.y  += 1/32 * delta;
		if(this.atmosphere){
			this.atmosphere.rotation.y  += 1/16 * delta;
		}
		// for(var i=0; i<moons.length; i++){
		// 	moons[i].animate(delta);
		// }
	}
}
var frameNum = 0;

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

//particle effect
var particleGeometry;
const minX = 250;
const maxX = 750;
const minY = -200;
const maxY = 200;
const minZ = 750;
const maxZ = 1250;

Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';
function fillScene() {

	scene = new Physijs.Scene();

	//the sun
	addLight(.8, 1, 1, 0, 0, 0);

	//The sky
	drawSkyBox();

	//The planets
	var ringly = drawPlanet({ x:500, y:0, z:1000, radius:planetRadius, folder:'ringly', atmosphere:true, rings:true });
	planets.push(ringly);

	var got = drawPlanet({ x:550, y:0, z:1050, radius:planetRadius, folder:'GoT', atmosphere:true });
	planets.push(got);

	var gasGiant = drawPlanet({ x:550, y:0, z:1000, radius:planetRadius, folder:'gasGiant1', atmosphere:true, rings:true });
	planets.push(gasGiant);

	var moon = drawPlanet({ x:500, y:0, z:1050, radius:planetRadius, folder:'moon'});
	planets.push(moon);


	for (const i in planets) {
		scene.add(planets[i].base);
	}

	//the dust
	drawParticles();
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

	//Lens flare
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

	//If there's an atomasphere, add one!
	if(atmosphere){
		cloudMesh = makeAtmosphere({radius:radius*1.015, folder});
		planetMesh.add(cloudMesh);
	}

	//If there's rings, add them
	if (rings) {
		ringMesh = makeRings({ radius, folder });
		planetMesh.add(ringMesh);
	}

	const planet = new Planet({base:planetMesh, atmosphere:cloudMesh, rings:ringMesh});
	return planet;
}

const makeAtmosphere = ({radius, folder}) => {

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
	material.map = new THREE.TextureLoader().load(`/Textures/${folder}/rings.png`);
	material.transparent = true;
	material.bumpMap = new THREE.TextureLoader().load(`/Textures/${folder}/ringsBump.png`);
	material.bumpScale = radius * 2;
	material.opacity = 0.6;
	material.side = THREE.DoubleSide;

	return new THREE.Mesh(geometry, material);
}

const drawParticles = () => {
	const numParticles = 5000;

	const particleMap = textureLoader.load( "/Textures/particles/ParticleTexture.png" );

	const colors = [];

	particleGeometry = new THREE.Geometry();

	let x, y, z;
	for (let i = 0; i < numParticles; i++) {
		x = (Math.random() * (maxX - minX)) + minX;
		y = (Math.random() * (maxY - minY)) + minY;
		z = (Math.random() * (maxZ - minZ)) + minZ;

		const particle = new THREE.Vector3(x, y, z);
		particle.dX = 0;
		if ((x % 3) > 2) {
			particle.dX = 0.025;
		}
		else if ((x % 3) > 1) {
			particle.dX = -0.025;
		}

		particle.dY = 0;
		if ((y % 3) > 2) {
			particle.dY = 0.025;
		}
		else if ((y % 3) > 1) {
			particle.dY = -0.025;
		}

		particle.dZ = 0;
		if ((z % 3) > 2) {
			particle.dZ = 0.025;
		}
		else if ((z % 3) > 1 || (particle.dX === 0 && particle.dY === 0)) {
			particle.dZ = -0.025;
		}
		particleGeometry.vertices.push(particle);
	}


	const material = new THREE.PointsMaterial({
		size: 1,
		map: particleMap,
		transparent: true
	});

	material.color.setHSL( 1.0, 0.2, 0.7 );

	const points = new THREE.Points(particleGeometry, material);
	scene.add(points);
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
	frameNum = (frameNum + 1) % 60
	cameraControls.update(delta);
	renderer.render(scene, camera);
	skybox.position = camera.position;
	TWEEN.update();

	skybox.rotation.y  += 1/64 * delta;
	//rotate planet
	planets[current].animate(delta);
	//only move particles every second frame because eficiency
	if (frameNum % 2 === 0)
	 moveParticles();
}

const moveParticles = () => {
	particleGeometry.vertices.forEach((particle => {
	 particle.add(new THREE.Vector3(particle.dX, particle.dY, particle.dZ));
	 if (particle.x > maxX) particle.x = minX;
	 if (particle.x < minX) particle.x = maxX;
	 if (particle.y > maxY) particle.y = minY;
	 if (particle.y < minY) particle.y = maxY;
	 if (particle.z > maxZ) particle.z = minZ;
	 if (particle.z < minZ) particle.z = maxZ;
 }));
 particleGeometry.verticesNeedUpdate = true;
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
