/*

Navigates to homepage and filters projects based on selected tag filters.

When we click a page card tag, a sidebar tag, a selector tag, a sector link, we set the URL to /home#?tag?tag
and then read the URL to define the filter. This way, no matter where we are on the site,
we go through the same logic path.

We expect a URL with an extra '?base' so that when it's empty, it doesn't scroll all the way up the window.

*/

//sector link behavior is already preset inside sector link href
//sidebar tag behavior is already preset inside sidebar tag link href

let tags = document.getElementsByClassName('projectModuleTags')[0];
if (tags) tags = tags.children;
else tags = [];

let projects = document.getElementsByClassName('projectModuleList')[0];
if (projects) projects = projects.children;
else projects = [];

const cards = document.getElementsByClassName('pageCard');

//page card tag
for (let card of cards) {
	for (let tag of card.getElementsByClassName('blockLinkHolder')) {
		tag.addEventListener('click', (e) => {
			e.preventDefault();
			modifyURI(tag.getElementsByClassName('blockLink')[0].innerText);
		});
	}
}

//tag selector
for (let tag of tags) {
	tag.addEventListener('click', (e) => {
		e.preventDefault();
		modifyURI(tag.getElementsByClassName('blockLink')[0].innerText);
	});
}

//read URL to find potential preset filters
function readFilters () {
	let preset = window.location.hash.split('?');

	for (let tag of tags) {
		let active = false;
		for (let p of preset) {
			if (p == tag.getElementsByClassName('blockLink')[0].innerText) {
				tag.classList.add('active');
				active = true;
			}
		}
		if (!active) tag.classList.remove('active');
	}

	redraw();
}

//add or remove projects from view
//also highlight currently active tags on project taglist

function redraw() {
	//if no tags are selected, make all projects visible
	let allInactive = true;
	for (let t of tags) {
		if (t.classList.contains('active')) allInactive = false;
	}

	if (allInactive) {
		for (let project of projects) {
			project.style.display = '';
			for (let l of project.getElementsByClassName('blockLinkHolder')) {
				l.classList.remove('active');
			}
		}
	} else
		//otherwise...
		for (let project of projects) {
			let links = project.getElementsByClassName('blockLinkHolder');
			let safe = false;

			for (let t of tags) {
				for (let l of links) {
					if (l.getElementsByClassName('blockLink')[0].innerText == t.getElementsByClassName('blockLink')[0].innerText) {
						if (t.classList.contains('active')) {
							safe = true;
							l.classList.add('active');
						} else l.classList.remove('active');
					}
				}
			}

			if (!safe) project.style.display = 'none';
			else project.style.display = '';
		}

	//scroll to projects title
	if (window.location.hash.includes("?base")) document.getElementById('Projects').scrollIntoView({behavior: "smooth"});
}

function modifyURI(string) {
	let URI = window.location.hash.split('?');
	let finalURI = '';
	for (let i = 1; i < URI.length; i++) {
		if (URI[i] == 'base') continue;
		finalURI += '?' + URI[i];
	}
	if (finalURI.includes('?' + string)) finalURI = finalURI.replace('?' + string, '');
	else finalURI += '?' + string;

	//replace() if not home to avoid writing to history
	if (window.location.pathname != '/home') window.location = window.location.origin + '/home#?base' + finalURI;
	else window.location.replace(window.location.origin + '/home#?base' + finalURI); 
	readFilters();
}

//sometimes a link will modify filters too
window.addEventListener("hashchange", () => {
	readFilters();
});

readFilters();