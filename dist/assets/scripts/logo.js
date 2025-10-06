//object wrap for Wire
var V = {};

//setup

//canvas ID
V.canvas = document.getElementById('vCanvas');

//determines the width of the wire shape
V.sizeX = 85;

//determines the height of the wire shape
V.sizeY = 100;

//number of rendered Wire objects
V.logoCount = 5;

//chance that the final Wire in the object array doesn't render after glitching (between 0 - 1, the higher, the more likely it is to render)
//might not render Wire if logoCount = 1 and renderLastChance < 1
V.renderLastChance = 0.5;

//determines whether or not wire randomization locks into a grid
V.gridLock = true;

//determines distance between grid points if gridlocked (make gridSize = sizeX for perfectly geometric arrangements)
V.gridSize = 85;

//colors
V.colorR = 0;
V.colorG = 0;
V.colorB = 0;

//animation

//determines how radically wire glitches
V.glitchyness = 50;

//determines how radically glitched the final wire will be once it stops glitching (must be at least (gridSize / 2 + 1) if wire is to change after glitching)
V.finalGlitchyness = 50;

//determines amount of time that it takes wire to stop glitching in millis (the duration of the glitch, essentially)
V.glitchTime = 300;

//determines amount of time spent not glitching in millis (calculated from the point where wire begins glitching)
V.downTime = 7000;

//determines how often wire blinks when not glitching (between 0 - 1, the higher, the more blinky)
V.blinkyness = 0.005;

//set up canvas context
V.ctx = V.canvas.getContext('2d');

//will hold Wire objects
V.logos = new Array(V.logoCount);

//determines whether or not to render the last Wire in the array (starts as true to ensure initial visibility)
V.renderLast = true;

//determines whether or not Wire is glitching (starts as false so as to give user a view of the base shape)
V.isGlitching = false;

//random float generator
function getRandomFloat(min, max) {
	return Math.random() * (max - min) + min;
}

//used to generate random numbers for wire coordinate randomization
function getRandomDisplacement(min, max) {
	var temp = Math.random() * (max - min) + min;
	
	//round to gridSize
	if (V.gridLock) return Math.round(temp / V.gridSize) * V.gridSize;
	else return temp;
}

//wire object
function Wire(newX, newY, newSizeX, newSizeY, newGlitchAmount, newStableGlitchAmount) {

	this.X = newX;
	this.Y = newY;
	this.sizeX = newSizeX;
	this.sizeY = newSizeY;

	this.glitchAmount = newGlitchAmount;
	this.stableGlitchAmount = newStableGlitchAmount;

	//number of points in drawn shape
	this.shapePoints = 4;
	//array size * 2 for holding both X and Y values of shape coordinates
	this.coords = new Array(this.shapePoints * 2);

	//sets lines to base shape
	this.setWire = function() {
		//top left coordinate
		this.coords[0] = this.X - this.sizeX;
		this.coords[1] = this.Y - this.sizeY;

		//top middle coordinate
		this.coords[2] = this.X;
		this.coords[3] = this.Y - this.sizeY / 2;

		//top right coordinate
		this.coords[4] = this.X + this.sizeX;
		this.coords[5] = this.Y - this.sizeY;

		//bottom middle coordinate
		this.coords[6] = this.X;
		this.coords[7] = this.Y + this.sizeY;
	}

	//draws shape
	this.drawWire = function() {
		V.ctx.beginPath();

		V.ctx.lineCap = 'round';
		V.ctx.lineJoin = 'round';
		V.ctx.lineWidth = 8;
		V.ctx.strokeStyle = "rgba(" + V.colorR + ", " + V.colorG + ", " + V.colorB + ", 1)";

		V.ctx.moveTo(this.coords[0], this.coords[1]);
		V.ctx.lineTo(this.coords[2], this.coords[3]);
		V.ctx.lineTo(this.coords[4], this.coords[5]);
		V.ctx.lineTo(this.coords[6], this.coords[7]);
		V.ctx.lineTo(this.coords[0], this.coords[1]);

		V.ctx.closePath();
		V.ctx.stroke();
	}

	//randomizes shape points drastically
	this.glitchWire = function() {
		for (var i = 0; i < this.coords.length; i++) {
			this.coords[i] += getRandomDisplacement(-this.glitchAmount, this.glitchAmount);
		}
	}

	//randomizes shape points more subtly
	this.stableGlitchWire = function() {
		for (var i = 0; i < this.coords.length; i++) {
			this.coords[i] += getRandomDisplacement(-this.stableGlitchAmount, this.stableGlitchAmount);
		}
	}
}

//runtime

//animation setup, assign Wire objects, set their initial position, and call draw function to start animation loop
function setup() {

	for (var i = 0; i < V.logos.length; i++) {
		V.logos[i] = new Wire(V.canvas.width/2, V.canvas.height/2, V.sizeX, V.sizeY, V.glitchyness, V.finalGlitchyness);
		V.logos[i].setWire();
	}

	window.requestAnimationFrame(draw);
}

//animation loop
function draw() {

	//clear canvas for next frame
	V.ctx.clearRect(0, 0, V.canvas.width, V.canvas.height);

	//glitch
	if (V.isGlitching) {
		//reset shape, glitch it, and draw it
		for (var i = 0; i < V.logos.length; i++) {
			V.logos[i].setWire();
			V.logos[i].glitchWire();
			V.logos[i].drawWire();
		}

		//reset it once more for a more stable glitching (in case glitching is about to end and we want the final Wire to be a bit more tamed)
		for (var i = 0; i < V.logos.length; i++) {
			V.logos[i].setWire();
			V.logos[i].stableGlitchWire();
		}

		//randomly decide if third Wire will be visible
		if (getRandomFloat(0, 1) <= V.renderLastChance) V.renderLast = true;
		else V.renderLast = false;

		//stop glitching after 400 millis
		setTimeout(function() {
			V.isGlitching = false;
		}, V.glitchTime);

		//else, render Wires with blinkyness
	} else {
		//render all Wires except for last one
		for (var i = 0; i < V.logos.length - 1; i++) {
			if (getRandomFloat(0, 1) > V.blinkyness) V.logos[i].drawWire();
			
		}
		//if renderLast ended up being true, then draw last Wire
		if (V.renderLast && getRandomFloat(0, 1) > V.blinkyness) V.logos[V.logoCount-1].drawWire();
	}
	
	//loop animation
	window.requestAnimationFrame(draw);
}

//triggers Wire glitches
setInterval(function() {
	V.isGlitching = true
}, V.downTime);

//on page load, call setup to start animation
window.addEventListener("DOMContentLoaded", function () {
	setup();
});