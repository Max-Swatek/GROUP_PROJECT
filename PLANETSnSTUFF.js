//Planet simulator
'user strict'

class Planet{
	constructor(base, atmosphere, rings){
		this.base = base;
		this.atmosphere = atmosphere;
		this.rings = rings;
	}
}
var frameNum = 0;

var camera, scene, cameraHUD, sceneHUD, hudBitmap, hudTexture, renderer;
var cameraControls;
var clock = new THREE.Clock();

const width = window.innerWidth;
const height = window.innerHeight

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

//millenium falcon
let mainShip;

Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

function fillScene() {

	scene = new Physijs.Scene();

	//the sun
	addLight(.8, 1, 1, 0, 0, 0);

	//The sky
	drawSkyBox();

	//The planets
	var earth1 = drawPlanet({ x:500, y:0, z:1000, radius:planetRadius, folder:'ringly', atmosphere:true, rings:true });
	planets.push(earth1);
	var ringly = drawPlanet({ x:550, y:0, z:1050, radius:planetRadius, folder:'earth', atmosphere:true });
	planets.push(ringly);

	for (const i in planets) {
		scene.add(planets[i].base);
	}

	//the falcon, of course
	drawMainShip();

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

	const planet = new Planet(planetMesh, cloudMesh, ringMesh);
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
	material.opacity = 0.6;
	material.side = THREE.DoubleSide;

	return new THREE.Mesh(geometry, material);
}

const drawMainShip = () => {
	new THREE.JSONLoader().load( '/Models/spaceship/falcon.json', (geometry, materials) => {
        mainShip = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial(materials) );
          mainShip.position.x =500;
          mainShip.position.y =0;
          mainShip.position.z =900;

					mainShip.maxSpeed = 2;
					mainShip.minSpeed = 0;
					mainShip.speedIntervals = 6;

					mainShip.speed = mainShip.minSpeed + 1;

				mainShip.add(camera);
        scene.add( mainShip );
			});

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
	var canvasRatio = width / height;

	// Set up a renderer. This will allow WebGL to make your scene appear
	renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );

	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setSize(width, height);
	renderer.setClearColor( 0xAAAAAA, 1.0 );
	renderer.autoClear = false;

	document.body.appendChild(renderer.domElement);

	// You also want a camera. The camera has a default position, but you most likely want to change this.
	// You'll also want to allow a viewpoint that is reminiscent of using the machine as described in the pdf
	// This might include a different position and/or a different field of view etc.
	camera = new THREE.PerspectiveCamera( 45, canvasRatio, 1, 16000 );
	// Moving the camera with the mouse is simple enough - so this is provided. However, note that by default,
	// the keyboard moves the viewpoint as well
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set( 10, 12, 45);
	//camera.position.set( 600, planetRadius, 1100);
	//cameraControls.target.set(500, planetRadius, 1000);
	//cameraControls.minDistance = cameraMinDistance;
	//cameraControls.maxDistance = cameraMaxDistance;
}


/*
**
**
** HUD
**
**
*/
	const initHUD = () => {
		var hudCanvas = document.createElement('canvas');

	  // Again, set dimensions to fit the screen.
	  hudCanvas.width = width;
	  hudCanvas.height = height;

	  // Get 2D context and draw something supercool.

	  hudBitmap = hudCanvas.getContext('2d');
		drawHUD();

	  // Create the camera and set the viewport to match the screen dimensions.
	  cameraHUD = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0, 30 );

	  // Create also a custom scene for HUD.
	  sceneHUD = new THREE.Scene();

		// Create texture from rendered graphics.
		hudTexture = new THREE.Texture(hudCanvas)
		hudTexture.needsUpdate = true;

	  // Create HUD material.

		increase = Math.PI * 2 / 100
	  var material = new THREE.MeshBasicMaterial( {map: hudTexture} );
	  material.transparent = true;

	  // Create plane to render the HUD. This plane fill the whole screen.
	  var planeGeometry = new THREE.PlaneGeometry( width, height );
	  var plane = new THREE.Mesh( planeGeometry, material );
	  sceneHUD.add( plane );

}

const drawHUD = () => {
	//assumes a max of 6 speedbars
	hudBitmap.clearRect(0, 0, width, height);

	hudBitmap.font = "Normal 30px Arial";
	hudBitmap.fillStyle = "rgba(245,245,245,0.75)";
	hudBitmap.fillText('Speed:', 20, height - 30);

	let numBars = 1;
	if (mainShip) numBars = mainShip.speed;

	for (let i = 0; i < numBars; i++) {
		let color = '#45F442';
		if (i === 1) color = '#ADF442';
		if (i ===2) color = '#F4F442';
		if (i === 3) color = '#F4D142';
		if (i === 4) color = '#F48042';
		if (i === 5) color = '#F24135';

		hudBitmap.beginPath();
		hudBitmap.rect(125 + (i * 15), height-53, 10, 25);
		hudBitmap.fillStyle = color;
		hudBitmap.fill();
	}

	if (hudTexture) hudTexture.needsUpdate = true;

}

/*
**
**
** End HUD
**
**
*/


function animate() {
	window.requestAnimationFrame(animate);

	// // Update HUD graphics.
  // 	hudBitmap.clearRect(0, 0, width, height);
  //   hudBitmap.fillText("RAD [x:", width / 2, height / 2); //+(cube.rotation.x % (2 * Math.PI)).toFixed(1)+", y:"+(cube.rotation.y % (2 * Math.PI)).toFixed(1)+", z:"+(cube.rotation.z % (2 * Math.PI)).toFixed(1)+"]" , width / 2, height / 2);
  //   hudTexture.needsUpdate = true;

	render();
}


function render() {
	scene.simulate();
	var delta = clock.getDelta();
	frameNum = (frameNum + 1) % 60
	cameraControls.update(delta);
	renderer.render(scene, camera);
	renderer.render(sceneHUD, cameraHUD);

	if (skybox) {
		skybox.position = camera.position;
	}
	TWEEN.update();

	//rotate planet
  planets[current].base.rotation.y  += 1/32 * delta;
  planets[current].atmosphere.rotation.y  += 1/16 * delta;

	//only move particles every second frame because eficiency
	if (frameNum % 2 === 0) {
	 moveParticles();
 }
	if (mainShip) {
	 moveMainShip();
	}
}

const moveParticles = () => {
	if (particleGeometry && particleGeometry.vertices) {
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
}

const moveMainShip = () => {
	if (mainShip.speed > mainShip.minSpeed) {
		mainShip.translateZ(-((mainShip.speed * (mainShip.maxSpeed - mainShip.minSpeed)) + mainShip.minSpeed));
	}
}

const speedUpShip = () => {
	if (mainShip && mainShip.speed < mainShip.speedIntervals) {
		mainShip.speed ++;
		drawHUD();
	}
}

const slowDownShip = () => {
	if (mainShip && (mainShip.speed / (mainShip.maxSpeed - mainShip.minSpeed)) > mainShip.minSpeed) {
		mainShip.speed --;
		drawHUD();
	}
}

function targetWorld(){
	current += 1;
	var index = current%planets.length
	cameraControls.target.set(planets[index].base.position.x, planets[index].base.position.y, planets[index].base.position.z);
	current = index;
}
document.onkeydown = function move(e) {
    switch (e.keyCode) {
        case 32: //space bar switches view
          targetWorld();
        	break;

				case 16: //shift speeds up ship
					speedUpShip();
					break;

				case 17: //control slows down ship
					slowDownShip();
					break;
    }
};

try {
  	init();
		initHUD();
  	fillScene();
  	animate();

} catch(error) {
    console.log("You did something bordering on utter madness. Error was:");
    console.log(error);
}
