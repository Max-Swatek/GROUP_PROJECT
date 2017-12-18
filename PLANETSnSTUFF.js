//Planet simulator
'user strict'

class Planet{

	constructor({base, atmosphere, rings, moons, tether}){
		this.base = base;
		this.atmosphere = atmosphere;
		this.rings = rings;
		this.moons = moons;
		this.tether = tether;
		this.orbit = 1/((base.position.x)/4);
	}

	animate(delta){
		this.tether.rotation.y += this.orbit * delta;
		this.base.rotation.y  += 1/32 * delta;
		if(this.atmosphere){
			this.atmosphere.rotation.y  += 1/16 * delta;
		}

		if(this.moons){
			for(let i=0; i<this.moons.length; i++){
				this.moons[i].animate(delta);
			}
		}
	}
}
var frameNum = 0;

var camera, scene, cameraHUD, sceneHUD, hudBitmap, hudTexture, renderer;
var laserBeams = [];
var cameraControls;
var clock = new THREE.Clock();


const width = window.innerWidth;
const height = window.innerHeight

const lightConstant = 1.5;
const planetRadius = 1; // for an average planet

var cameraMinDistance = planetRadius*2.5;
var cameraMaxDistance = planetRadius*3000;

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

//Tie fighter cuz millenium falcon had too many polys
let mainShip;
const speedIntervals = 6;

Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

function fillScene() {

	scene = new Physijs.Scene();

	//the sun
	addLight(.8, 1, 1, 0, 0, 0);

	//The sky
	drawSkyBox();

	//The planets
	//a venus like thick atmosphered terestrial
	var volcano = drawPlanet({ x:650, y:0, z:0, radius:planetRadius, folder:'tatooine', atmosphere:true });
	planets.push(volcano);

	var poke = drawPlanet({ x:750, y:0, z:0, radius:planetRadius, folder:'PokeMap', atmosphere:true,numMoons:1 });
	planets.push(poke);

	var got = drawPlanet({ x:850, y:0, z:0, radius:planetRadius, folder:'GoT', atmosphere:true, numMoons:2 });
	planets.push(got);

	var Ringly = drawPlanet({ x:1050, y:0, z:0, radius:planetRadius*4, folder:'gasGiant1', atmosphere:true, rings:true, numMoons:8 });
	planets.push(Ringly);

	var Ringly1 = drawPlanet({ x:1550, y:0, z:0, radius:planetRadius*6, folder:'gasGiant2', atmosphere:true, rings:true, numMoons:10 });
	planets.push(Ringly1);

	for (const i in planets) {
		scene.add(planets[i].tether);
	}

	drawMainShip();

	//the dust
	drawParticles({ minX: -1000, maxX: 1000, minY: -150, maxY: 150, minZ: -1000, maxZ: 1000, numParticles: 5000 });

}
function drawTieFighter(){
	let tie = new THREE.SphereGeometry(0.01,32,32);
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

function drawPlanet({x,y,z, radius, folder, atmosphere, rings, numMoons}) {
	let planetGeometry = new THREE.SphereGeometry(radius,32,32);
	let planetMaterial = new THREE.MeshPhongMaterial();
	planetMaterial.map = new THREE.TextureLoader().load(`/Textures/${folder}/map.jpg`);
	planetMaterial.bumpMap = new THREE.TextureLoader().load(`/Textures/${folder}/bump.jpg`);
	planetMaterial.bumpScale = radius;
	planetMaterial.specularMap = new THREE.TextureLoader().load(`/Textures/${folder}/spec.jpg`);
	planetMaterial.specular = new THREE.Color('grey');

	let planetMesh = new THREE.Mesh(planetGeometry,planetMaterial);
	planetMesh.position.x = x;
	planetMesh.position.y = y+radius;
	planetMesh.position.z = z;

	let cloudMesh = null;
	let ringMesh = null;
	let moons = null;

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

	//If theres an amount of moons requiered, add them
	if(numMoons){
		moons = [];
		let minOrbit = radius*6
		for(let i=0; i<numMoons; i++){
			let moonRadius = (radius/16)*(1+(Math.random()*3));
			let moon = drawPlanet({x:minOrbit+i*(radius+ moonRadius), y:-moonRadius, z:0, radius:moonRadius, folder:`moon${i%5}`})
			planetMesh.add(moon.tether);
			moons.push(moon);
		}
	}
	let tether = makeTether();
	//tether.add(planetMesh);
	const planet = new Planet({base:planetMesh, atmosphere:cloudMesh, rings:ringMesh, moons:moons, tether:tether});
	planet.tether.add(planet.base);
	return planet;
}
function makeTether(){
	let tether = new THREE.Mesh(
		new THREE.SphereGeometry(planetRadius/10, 5, 5),
		textureLoader.load( "/Textures/particles/ParticleTexture.png" )
	);
	tether.position.x = 0;
	tether.position.y = 0;
	tether.position.z = 0;
	return tether;
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

const drawMainShip = () => {
	new THREE.JSONLoader().load( '/Models/spaceship/TIE.json', (geometry, materials) => {
        mainShip = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial(materials) );
          mainShip.position.x =500;
          mainShip.position.y =0;
          mainShip.position.z =900;

					mainShip.maxSpeed = 2;
					mainShip.minSpeed = 0;

					mainShip.speed = 1;

				//Add the camera
				mainShip.add(camera);

        scene.add( mainShip );
			});

}

const fireLaser = () => {
	//Add the laza's
	const laser = new THREEx.LaserBeam().object3d

	//laser.position.copy(mainShip.position);
	laser.scale.set(10, 5, 5);
	laser.rotation.y = Math.PI;
	//scene.add(laser);
	mainShip.add(laser);
	laserBeams.push({ laser, time: new THREE.Clock() });
}


const drawParticles = ({ minX, maxX, minY, maxY, minZ, maxZ, numParticles }) => {
	const particleMap = textureLoader.load( "/Textures/particles/ParticleTexture.png" );

	particleGeometry = new THREE.Geometry();
	particleGeometry.minX = minX;
	particleGeometry.minY = minY;
	particleGeometry.minZ = minZ;
	particleGeometry.maxX = maxX;
	particleGeometry.maxY = maxY;
	particleGeometry.maxZ = maxZ;

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

	camera.position.set( planetRadius*25, planetRadius*5, 0);
	cameraControls.minDistance = cameraMinDistance;
	cameraControls.maxDistance = cameraMaxDistance;

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

	  // Create the camera and set the viewport to match the screen dimensions.
	  cameraHUD = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0, 30 );

	  // Create also a custom scene for HUD.
	  sceneHUD = new THREE.Scene();

		// Create texture from rendered graphics.
		hudTexture = new THREE.Texture(hudCanvas)

		//draw theHUD
		drawHUD();

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
	const colors = ['#45F442', '#ADF442', '#F4F442', '#F4D142', '#F48042', '#F24135'];

	//draw speed bars
	for (let i = 0; i < numBars; i++) {

		hudBitmap.beginPath();
		hudBitmap.rect(125 + (i * 15), height-53, 10, 25);
		hudBitmap.fillStyle = colors[i];
		hudBitmap.fill();
	}

	//draw empty speed bars
	for (let i = 0; i < speedIntervals; i++) {

		hudBitmap.beginPath();
		hudBitmap.rect(125 + (i * 15), height-53, 10, 25);
		hudBitmap.strokeStyle = colors[i];
		hudBitmap.lineWidth = "2";
		hudBitmap.stroke();
	}

	hudTexture.needsUpdate = true;
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
	//cameraControls.target.set(planets[current].base.position.x, planets[current].base.position.y, planets[current].base.position.z);
	renderer.render(scene, camera);

	renderer.render(sceneHUD, cameraHUD);

	skybox.rotation.z  -= 1/64 * delta;//faking orbits
	//rotate planet
	for(let i=0; i<planets.length; i++){
		planets[i].animate(delta);
	}
	//only move particles every second frame because eficiency
	if (frameNum % 2 === 0) {
	 moveParticles();
 }

 //moves the ship and rotates if applicable
	if (mainShip) {
	 moveMainShip(delta);
	}

	if (laserBeams && laserBeams.length > 0) {
		moveLasers(delta);
	}
}

const moveParticles = () => {
	const { minX, maxX, minY, maxY, minZ, maxZ } = particleGeometry
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

const moveLasers = (delta) => {
	for (const i in laserBeams) {
		const laser = laserBeams[i];
		//don't move it if it's far enough away
		if (laser.time.getElapsedTime() < 4 ) {
			laserBeams[i].laser.translateX(5);
		}

	}
}
const moveMainShip = (delta) => {
	const steeringSpeed = .3 + (((mainShip.speed * .3) + 0.001)/ (mainShip.maxSpeed + .001)); //can move quicker at higher speeds

	if (mainShip.speed > mainShip.minSpeed) {
		mainShip.translateX(-(((mainShip.speed / speedIntervals) * (mainShip.maxSpeed - mainShip.minSpeed)) + mainShip.minSpeed));
	}

	if (mainShip.rotateLeft) {
		mainShip.rotateX(1 * steeringSpeed * delta);
	}

	else if (mainShip.rotateRight) {
		mainShip.rotateX(-1 * steeringSpeed * delta);
	}

	if (mainShip.pitchUp) {
		mainShip.rotateZ(-1 * steeringSpeed * delta);
	}

	else if (mainShip.pitchDown) {
		mainShip.rotateZ(1 * steeringSpeed * delta);
	}

	if (mainShip.bankLeft) {
		mainShip.rotateY(1 * steeringSpeed * delta);
	}

	else if (mainShip.bankRight) {
		mainShip.rotateY(-1 * steeringSpeed * delta);
	}
}

const speedUpShip = () => {
	if (mainShip && mainShip.speed < speedIntervals) {
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

const rotateShipLeft = (pressed) => {
	if (mainShip) {
		mainShip.rotateLeft = pressed;
	}
}

const rotateShipRight = (pressed) => {
	if (mainShip) {
		mainShip.rotateRight = pressed;
	}
}

const pitchShipUp = (pressed) => {
	if (mainShip) {
		mainShip.pitchUp = pressed;
	}
}

const pitchShipDown = (pressed) => {
	if (mainShip) {
		mainShip.pitchDown = pressed;
	}
}

const bankShipLeft = (pressed) => {
	if (mainShip) {
		mainShip.bankLeft = pressed;
	}
}

const bankShipRight = (pressed) => {
	if (mainShip) {
		mainShip.bankRight = pressed;
	}
}

function targetWorld(){
	current += 1;
	var index = current%planets.length
	const planet = planets[index];

	planets[index].base.add(camera);
	camera.position.set( planetRadius*25, planetRadius*5, 0);

	current = index;
}

document.onkeydown = function move(e) {
    switch (e.keyCode) {

				case 32: //space fires laser
					fireLaser();
					break;

				case 80://p for planet
					targetWorld();
					break;

				case 77://m for moons

					break;


				case 16: //shift speeds up ship
					speedUpShip();
					break;

				case 17: //control slows down ship
					slowDownShip();
					break;

				case 65: //A rotates ship left
					rotateShipLeft(true);
					break;

				case 68: //D rotates ship right
					rotateShipRight(true);
					break;

				case 83: //S ups the ship's pitch
					pitchShipUp(true);
					break;

				case 87: //w downs the ship's pitch
					pitchShipDown(true);
					break;

				case 81: //q banks left
					bankShipLeft(true);
					break;

				case 69: //69 banks right (it banks a couple other things too ;)
					bankShipRight(true);
					break;
    }
};

document.onkeyup = function move(e) {
    switch (e.keyCode) {

				case 65: //A rotates ship left
					rotateShipLeft(false);
					break;

				case 68: //D rotates ship right
					rotateShipRight(false);
					break;

				case 83: //S ups the ship's pitch
					pitchShipUp(false);
					break;

				case 87: //w downs the ship's pitch
					pitchShipDown(false);
					break;

				case 81: //q banks left
					bankShipLeft(false);
					break;

				case 69: //69 banks right (it banks a couple other things too ;)
					bankShipRight(false);
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
