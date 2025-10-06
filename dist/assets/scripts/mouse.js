let follow = document.getElementById("mouseFar");
let icon = document.getElementById("mouseIcon");

let cursorX = -1;
let cursorY = -1;
let fCursorX = -1;
let fCursorY = -1;

const ease = 0.2;

const followSize = 40;
const iconSize = 25;

const opacity = 0.25;

let reset = true;

document.addEventListener('mousemove', function(e) {
	cursorX = e.clientX;
	cursorY = e.clientY;
});

window.requestAnimationFrame(run);

function run() {
	if (cursorX == undefined || cursorY == undefined) {
		window.requestAnimationFrame(run);
		return;
	}

	dx = cursorX - fCursorX;
	fCursorX += dx * ease;

	dy = cursorY - fCursorY;
	fCursorY += dy * ease;

	if (reset) {
		fCursorX = cursorX;
		fCursorY = cursorY;

		if (cursorX != -1) reset = false;
	} else {
		follow.style.opacity = opacity;
		icon.style.opacity = 1;
	}

	follow.style.left = fCursorX - followSize / 2 + 'px';
	follow.style.top = fCursorY - followSize / 2 + 'px';

	icon.style.left = (fCursorX - iconSize / 2) + 15 + 'px';
	icon.style.top = (fCursorY - iconSize / 2) - 15 + 'px';

	window.requestAnimationFrame(run);
}