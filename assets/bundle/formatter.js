/*

Takes an HTML page and replaces its placeholder variables (defined as $variable) with artifact data.

*/

import {globals} from './globals.js';

import * as fs from 'node:fs';

//applies artifact to an html template
export function formatHTMLPage(artifact) {
	let page = fs.readFileSync(globals.pageTemplatePath, {encoding: 'utf8', flag: 'r'});

	//basics
	page = page.replace(/\$name/g, artifact.name);
	page = page.replace(/\$strippedTitle/g, artifact.title.replace(/<\/?[^>]+(>|$)/g, ''));
	page = page.replace(/\$title/g, artifact.title);
	page = page.replace(/\$headerTitle/g, artifact.imageName);
	page = page.replace(/\$content/g, artifact.content);
	page = page.replace(/\$lastModified/g, `${artifact.lastModified.getFullYear()}.${(artifact.lastModified.getMonth()+1).toString().padStart(2, 0)}.${artifact.lastModified.getDate().toString().padStart(2, 0)}`);

	//image
	if (artifact.image != null) {
		page = page.replace(/\$image/g, artifact.image);
		page = page.replace(/\$noHeader/g, '');
	} else page = page.replace(/\$noHeader/g, '<style>#header{height:140px;background-color:var(--default);}</style>');

	//log data
	let sector = 'DEF';

	if (globals.db.prepare(`SELECT EXISTS(SELECT * FROM Productivity WHERE lower(Project) = '${artifact.name.toLowerCase().replace(/\'/g,"''")}') AS logs`).all()[0].logs > 0 && !artifact.tags.includes('professional') || artifact.name.toLowerCase() == 'home') { //escape single quote by doubling it
		const a = artifact.name.toLowerCase().replace(/\'/g,"''");

		let startDate = null;
		let endDate = null;

		let abstract = null;
		let audio = null;
		let code = null;
		let visual = null;
		let divisions = [];

		let hours = null;
		let logs = null;
		let days = null;
		let hoursPerDay = null;
		
		if (artifact.name.toLowerCase() == 'home') {
			startDate = globals.db.prepare("SELECT Date AS start FROM Productivity ORDER BY Date ASC LIMIT 1").all()[0].start.replaceAll('-', '.');
			endDate = globals.db.prepare("SELECT Date AS end FROM Productivity ORDER BY Date DESC LIMIT 2").all()[1].end.replaceAll('-', '.');

			abstract = globals.db.prepare("SELECT SUM(Time) AS abstract FROM Productivity WHERE DIVISION = 'Abstract'").all()[0].abstract;
			audio = globals.db.prepare("SELECT SUM(Time) AS audio FROM Productivity WHERE DIVISION = 'Audio'").all()[0].audio;
			code = globals.db.prepare("SELECT SUM(Time) AS code FROM Productivity WHERE DIVISION = 'Code'").all()[0].code;
			visual = globals.db.prepare("SELECT SUM(Time) AS visual FROM Productivity WHERE DIVISION = 'Visual'").all()[0].visual;
			divisions = [{'hours': abstract, DIV: 'ABS'}, {'hours': audio, DIV: 'AUD'}, {'hours': code, DIV: 'COD'}, {'hours': visual, DIV: 'VIS'}].sort((a, b) => b.hours - a.hours);

			hours = globals.db.prepare("SELECT SUM(Time) AS hours FROM Productivity").all()[0].hours;
			logs = globals.db.prepare("SELECT COUNT(*) AS logs FROM Productivity").all()[0].logs;
			days = globals.db.prepare("SELECT COUNT(DISTINCT(Date)) AS days FROM Productivity").all()[0].days;
			hoursPerDay = (hours / days).toFixed(1);
		} else {
			startDate = globals.db.prepare(`SELECT Date AS start FROM Productivity WHERE lower(Project) = '${a}' ORDER BY Date ASC LIMIT 1`).all()[0].start.replaceAll('-', '.');
			endDate = globals.db.prepare(`SELECT Date AS end FROM Productivity WHERE lower(Project) = '${a}' ORDER BY Date DESC LIMIT 1`).all()[0].end.replaceAll('-', '.');

			abstract = globals.db.prepare(`SELECT SUM(Time) AS abstract FROM Productivity WHERE lower(Project) = '${a}' AND DIVISION = 'Abstract'`).all()[0].abstract;
			audio = globals.db.prepare(`SELECT SUM(Time) AS audio FROM Productivity WHERE lower(Project) = '${a}' AND DIVISION = 'Audio'`).all()[0].audio;
			code = globals.db.prepare(`SELECT SUM(Time) AS code FROM Productivity WHERE lower(Project) = '${a}' AND DIVISION = 'Code'`).all()[0].code;
			visual = globals.db.prepare(`SELECT SUM(Time) AS visual FROM Productivity WHERE lower(Project) = '${a}' AND DIVISION = 'Visual'`).all()[0].visual;
			divisions = [{'hours': abstract, DIV: 'ABS'}, {'hours': audio, DIV: 'AUD'}, {'hours': code, DIV: 'COD'}, {'hours': visual, DIV: 'VIS'}].sort((a, b) => b.hours - a.hours);

			hours = globals.db.prepare(`SELECT SUM(Time) AS hours FROM Productivity WHERE lower(Project) = '${a}'`).all()[0].hours;
			logs = globals.db.prepare(`SELECT COUNT(*) AS logs FROM Productivity WHERE lower(Project) = '${a}'`).all()[0].logs;
			days = globals.db.prepare(`SELECT COUNT(DISTINCT(Date)) AS days FROM Productivity WHERE lower(Project) = '${a}'`).all()[0].days;
			hoursPerDay = (hours / days).toFixed(1);
		}

		sector = divisions[0].DIV;

		let result = '<div class="sideBox">';
		result += `<span class="sideText">${startDate} · ${endDate}</span>`;
		for (let i = 0; i < divisions.length; i++) {
			if (divisions[i].hours != null) {
				const percent = divisions[i].hours / divisions[0].hours * 100;
				result += `<span class="logStat">${divisions[i].DIV}</span><div class="logBar" style="width: calc(${percent}% - ${percent/100 * 35}px);"></div><br>`;
			}
		}
		result += `<span class="sideText">${hours} hours · ${logs} logs</span>`;
		result += `<span class="sideText">${days} days · ${hoursPerDay} hours / day</span>`;
		result += '</div>';

		page = page.replace(/\$logData/g, `${result}<div class="sideDivider"></div>`);
	} else page = page.replace(/\$logData/g, '');

	//sector
	if (artifact.tags.includes('writing') && sector == 'ABS') sector = 'WRI';
	if (artifact.tags.includes('professional')) sector = 'PRO';
	if (!artifact.tags.includes('project')) sector = 'DEF';
	page = page.replace(/\$sectorIcon/g, `../assets/ui/${sector.toLowerCase()}.svg`);

	let link = '';
	switch(sector) {
		case 'ABS':
		case 'WRI':
			link = 'Writing';
			break;

		case 'AUD':
			link = 'Single';
			break;

		case 'COD':
			link = 'Tool';
			break;

		case 'PRO':
			link = 'Professional';
			break;

		case 'VIS':
			link = 'Graphic';
			break;
	}

	page = page.replace(/\$sectorLink/g, link);

	//links
	if (artifact.links) {
		let links = '';
		for (let i = 0; i < artifact.links.length; i++) {
			links += `<a href="${artifact.links[i][1]}" class="sideLinkHolder"><span class="neutralLink sideLink">${artifact.links[i][0]}</span></a>`;
		}
		page = page.replace(/\$links/g, `${links}<div class="sideDivider"></div>`);
	} else page = page.replace(/\$links/g, '');

	//related
	let related = '';
	for (let i = 0; i < globals.artifacts.length; i++) {
		const intersection = artifact.tags.filter(value => globals.artifacts[i].tags.includes(value));
		const filtered = intersection.filter((value) => value !== 'project' && value !== 'nav' && value !== 'debug' && value !== 'research' && value !== 'personal');
		if (filtered.length > 0) {
			if (globals.artifacts[i] == artifact) related += `<span class="sidebarRelatedTitle sidebarRelatedSame">${globals.artifacts[i].title}</span>`;
			else related += `<span class="sidebarRelatedTitle">${globals.artifacts[i].title}</span>`;
		}
	}
	if (related === '') page = page.replace(/\$related/g, '');
	else page = page.replace(/\$related/g, `<span class="sideTitle"><b>Related</b></span>${related}<div class="sideDivider"></div>`);

	//tags
	let tags = '';
	for (let i = 0; i < artifact.tags.length; i++) {
		let link = '';
		switch (artifact.tags[i]) {
			case 'audio':
			case 'album':
			case 'single':
				link = 'Single';
				break;

			case 'code':
			case 'tool':
			case 'interactive':
			case 'display':
				link = 'Tool';
				break;

			case 'visual':
			case 'graphic':
			case 'photography':
			case 'project':
				link = 'Graphic';
				break;

			case 'writing':
			case 'research':
				link = 'Writing';
				break;

			case 'professional':
				link = 'Professional';
				break;
		}

		tags += `<a href="home#${link}" class="sideLinkHolder"><span class="neutralLink sideLink">${artifact.tags[i]}</span></a>`;
	}
	page = page.replace(/\$tags/g, tags + '<div class="sideDivider"></div>');

	//footer
	page = page.replace(/\$logDays/g, globals.db.prepare("SELECT COUNT(DISTINCT(Date)) AS sum FROM Productivity").get().sum + ' Days<br>')
	page = page.replace(/\$logHours/g, globals.db.prepare("SELECT SUM(Time) AS sum FROM Productivity").get().sum + ' Hours')

	return page;
}