/*

Takes all .txt artifact files, parses them, and outputs an .html page for each.
Needs to be run locally with NodeJS.

*/

const fs = require('node:fs');
const readline = require('node:readline');
const { DatabaseSync } = require('node:sqlite');

//globals
const root = 'https://v-os.nyc3.cdn.digitaloceanspaces.com';
const fileDirectory = root + '/files/';
const imageDirectory = root + '/images/';
const soundDirectory = root + '/sounds/';
const videoDirectory = root + '/videos/';

const logPath = 'assets/log/Productivity.csv';
const pageTemplatePath = 'assets/html/page.html';
const artifactDirectory = 'artifacts';

const artifacts = [];

function parse(string, type) {
	//these rules try to preserve whitespace and line breaks as much as possible as they are used later to create line breaks,
	//and because deleting them can cause problems for some rules later down the line
	const contentParseRules = [
		//quoteblock (accompanied by post-process code): >
		[/(?<!\\)(> +.+?)(\n{2,}|$)/gs, '<blockquote>$1</blockquote>$2'],

		//spacious list (accompanied by post-process code): 1.
		[/^(?<!\\)(\d+\. +.+?)(\n\D|$(?![\r\n]))/gsm, '<ol class="spaciousList">$1</ol>$2'],

		//condensed list (accompanied by post-process code): -
		[/^(?<!\\)(- +.+?)(\n[^-]|$(?![\r\n]))/gsm, '<ul class="condensedList">$1</ul>$2'],

		//title: ##, #
		[/^(?<!\\)#{2}\s?([^\n]+)/gm, '<h3 id="$1">$1</h3>'],
		[/^(?<!\\)#{1}\s?([^\n]+)/gm, '<h2 id="$1">$1</h2>'],

		//divider: ---
		[/^(?<!\\)(\n)-{3,}(\s?\n)/gm, '$1<hr>$2'],

		//italibold: **, ****
		[/(?<!\\)\*\*\s?([^*]+)\*\*/g, '<b>$1</b>'],
		[/(?<!\\)\*\s?([^*]+)\*/g, '<i>$1</i>'],

		//code: ``` ```, ``
		[/^(?<!\\)\`{3}\n\s?([^\`]+)\`{3}/gm, '<code class="codeBlock">$1</code class="codeBlock">'],
		[/(?<!\\)\`\s?([^`]+)\`/g, '<code>$1</code>'],

		//tag list & tag title list (accompanied by post-process code): =[], -[]
		[/^(?<!\\)=\[\s?([^\]]+)\]/gm, '<ul class="tagList condensedList" tag="$1"></ul>'],
		[/^(?<!\\)-\[\s?([^\]]+)\]/gm, '<ul class="tagTitleList spaciousList" tag="$1"></ul>'],

		//embed media: ![]
		[/(?<!\\)\!\[([^\]]+)\]\(([^)]+)(\.png|\.jpg|\.gif)\)/g, `<img class="textImage" src="${imageDirectory}$2$3" alt="$1">`], //image, supports PNG, JPG, and GIF
		[/(?<!\\)\!\[([^\]]+)\]\(([^)]+)(\.mp4|\.mov)\)/g, `<video class="video" controls="" src="${videoDirectory}$2$3" alt="$1"></video>`], //video, supports MP4 and MOV
		[/(?<!\\)\!\[([^\]]+)\]\(([^)]+)(\.mp3|\.wav)\)/g, `<audio class="audio" controls=""><source src="${soundDirectory}$2$3" alt="$1"></audio>`], //audio, supports MP3 and WAV
		[/(?<!\\)\!\[([^\]]+)\]\(([^)]+)(\.*?)\)/g, `<a href="${fileDirectory}$2$3" alt="$1">$1</a>`], //files

		//execute code (accompanied by post-process code): %[]
		[/(?<!\\)\%\[([^\]]+)\]/g, '<span class="execute" execute="$1"></span>'],

		//local link: @[]
		[/(?<!\\)\@\[([^\]]+)\]/g, '<a href="$1" class="localLink">$1</a>'],
		
		//external link: []()
		[/(?<!\\)\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>'],

		//stylized link (accompanied by post-process code): &[]
		[/(?<!\\)\&\[([^\]]+)\]/g, '<div href="$1" class="stylizedLink">$1</div>'],

		//recently updated pages (accompanied by post-process code): ?[]
		[/(?<!\\)\?\[([^\]]+)\]/g, '<div recentlyUpdatedPages="$1"></div>'],

		//recent logs (accompanied by post-process code): *[]
		[/(?<!\\)\*\[([^\]]+)\]/g, '<div recentLogs="$1"></div>'],

		//escape characters: \
		[/\\(?!\\)/g, ""],

		//add paragraph tags at start and end
		[/^/g, '<p>'],
		[/$/g, '</p>'],

		//add paragraph open tags after paragraph blocking elements
		[/(<\/div>|<\/h1>|<\/h2>|<\/h3>|<\/h4>|<\/blockquote>|<\/ol>|<\/ul>|<\/code class="codeBlock">|<hr>|<img.+>|<\/video>|<\/audio>)/g, '$1<p>'],

		//add paragraph close tags before paragraph blocking elements
		[/(<div|<h1|<h2|<h3|<h4|<blockquote|<ol|<ul|<code class="codeBlock"|<hr|<img|<video|<audio)/g, '</p>$1'],

		//remove empty <p> tags
		[/<p>\n*<\/p>/g, ''],
	];

	const titleParseRules = [
		//italibold: **, ****
		[/(?<!\\)\*\*\s?([^*]+)\*\*/g, '<b>$1</b>'],
		[/(?<!\\)\*\s?([^*]+)\*/g, '<i>$1</i>'],

		//local link: @[]
		[/(?<!\\)\@\[([^\]]+)\]/g, '<a href="$1" class="localLink">$1</a>'],

		//execute code (accompanied by post-process code): %[]
		[/(?<!\\)\%\[([^\]]+)\]/g, '<span class="execute" execute="$1"></span>'],
		
		//external link: []()
		[/(?<!\\)\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>'],

		//escape characters: \
		[/\\(?!\\)/g, ""],
	];

	const imageNameParseRules = [
		//local link: @[]
		[/(?<!\\)\@\[([^\]]+)\]/g, '<a href="$1" class="localLink">$1</a>'],
	];

	switch (type) {
		case 'content':
			contentParseRules.forEach(([rule, template])=> {
				string = string.replace(rule, template);
			});
			break;

		case 'title':
			titleParseRules.forEach(([rule, template])=> {
				string = string.replace(rule, template);
			});
			break;

		case 'imageName':
			imageNameParseRules.forEach(([rule, template])=> {
				string = string.replace(rule, template);
			});
			break;
	}
	
	return string;
}

//some parsing (line breaks, list items, syntax cleanups, etc.) is easier to do as a secondary step
function secondParse(string) {
	string = addLineBreaks(string, 'p');
	string = addLineBreaks(string, 'blockquote');
	string = addLineBreaks(string, 'ul');
	string = addLineBreaks(string, 'ol');
	string = addLineBreaks(string, 'code');

	string = getRecentlyUpdatedPages(string);
	string = getRecentLogs(string);
	string = stylizedLinks(string);
	string = fixQuoteAndListSyntax(string);
	string = addListItems(string);
	string = executeJS(string);

	return string;
}

//isolates target elements, adds line breaks, and injects them back into the string
function addLineBreaks(string, tag) {
	const elements = getElementsInString(string, tag);
	for (let i = 0; i < elements.length; i++) {
		const tagStart = elements[i][1];
		const content = elements[i][2];
		string = string.replace(tagStart + content, tagStart + content.trim().replace(/\n/g, '<br>'));
	}
	return string;
}

//removes formatting syntax at start of each line for quoteblock and lists (unordered + ordered)
function fixQuoteAndListSyntax(string) {
	const blockquotes = getElementsInString(string, 'blockquote');
	
	for (let i = 0; i < blockquotes.length; i++) {
		const tagStart = blockquotes[i][1];
		const content = blockquotes[i][2];
		string = string.replace(tagStart + content, tagStart + content.replace(/(^|<br>)> ?/g, '$1'));
	}

	const unorderedLists = getElementsInString(string, 'ul');
	for (let i = 0; i < unorderedLists.length; i++) {
		const tagStart = unorderedLists[i][1];
		const content = unorderedLists[i][2];
		string = string.replace(tagStart + content, tagStart + content.replace(/(^|<br>)- (.+?)(?=<br>|$)/g, '<li>$2</li>'));
	}

	const orderedLists = getElementsInString(string, 'ol');
	for (let i = 0; i < orderedLists.length; i++) {
		const tagStart = orderedLists[i][1];
		const content = orderedLists[i][2];
		string = string.replace(tagStart + content, tagStart + content.replace(/(^|<br>)\d+\. ?(.+?)(?=<br>|$)/g, '<li>$2</li>'));
	}

	return string;
}

//fills and formats procedural list items to proper html
function addListItems(string) {
	const tagLists = [...string.matchAll(/(<ul class="tagList condensedList" tag="([^"]*?)"[^>]*?>)(.*?)(?:<\/ul>)/gs)];
	for (let i = 0; i < tagLists.length; i++) {
		const tag = tagLists[i][2];
		const items = tagList(tag);
		string = string.replace(tagLists[i][1], tagLists[i][1] + items);
	}

	const tagTitleLists = [...string.matchAll(/(<ul class="tagTitleList spaciousList" tag="([^"]*?)"[^>]*?>)(.*?)(?:<\/ul>)/gs)];
	for (let i = 0; i < tagTitleLists.length; i++) {
		const tag = tagTitleLists[i][2];
		const items = tagList(tag, true);
		string = string.replace(tagTitleLists[i][1], tagTitleLists[i][1] + items);
	}

	return string;
}

//finds and executes requested js code
function executeJS(string) {
	const elements = [...string.matchAll(/(<span class="execute" execute="([^"]*?)"[^>]*?>)(.*?)(?:<\/span>)/gs)];
	for (let i = 0; i < elements.length; i++) {
		const code = elements[i][2];
		const result = eval(code);
		string = string.replace(elements[i][1], elements[i][1] + result);
	}

	return string;
}

//finds and adds list items for requested tag
function tagList(tag, title=false) {
	let items = '';

	artifacts.forEach(artifact => {
		if (artifact.tags != null) {
			if (artifact.tags.includes(tag)) {
				let item;
				if (title) item = `<li>${artifact.title}</li>`;
				else item = `<li><a href="${artifact.name}" class="localLink">${artifact.name}</a></li>`;
				items += item;
			}
		}
	});

	return items;
}

//finds and creates stylized link
function stylizedLinks(string) {
	const elements = [...string.matchAll(/(<div href="([^"]*?)" class="stylizedLink">(.*?)<\/div>)/gs)];
	for (let i = 0; i < elements.length; i++) {
		const href = elements[i][2];
		let artifact = null;
		for (let i = 0; i < artifacts.length; i++) {
			if (artifacts[i].name.toLowerCase() === href.toLowerCase()) artifact = artifacts[i];
		}
		if (artifact != null) string = string.replace(elements[i][1], `<div class="pageCard"><a href="${href}" class="pageCardImage" href="${href}" style="background-image:url(${artifact.image})"></a><div class="pageCardTitle"><span>${artifact.title}</span></div></div>`);
	}

	return string;
}

//builds styled link list of recently updated pages
function getRecentlyUpdatedPages(string) {
	const elements = [...string.matchAll(/(<div recentlyUpdatedPages="([^"]*?)"><\/div>)/gs)];

	let sortedArtifacts = artifacts.slice().sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()); //avoid changing original array
	sortedArtifacts = sortedArtifacts.filter((value) => !value.tags.includes('nav') && !value.tags.includes('debug'));
		
	for (let i = 0; i < elements.length; i++) {
		const entries = elements[i][2];
		sortedArtifacts = sortedArtifacts.slice(0, entries);
	
		let output = '';
		for (let j = 0; j < sortedArtifacts.length; j++) {
			output += `<div href="${sortedArtifacts[j].name}" class="stylizedLink">${sortedArtifacts[j].name}</div>`;
		}

		string = string.replace(elements[i][0], output);
	}
	
	return string;
}

//builds codeBlock list of recent logs
function getRecentLogs(string) {
	const elements = [...string.matchAll(/(<div recentLogs="([^"]*?)"><\/div>)/gs)];

	for (let i = 0; i < elements.length; i++) {
		const entries = parseInt(elements[i][2]) + 1;

		let query = db.prepare(`SELECT * FROM Productivity LIMIT ${entries}`).all();

		let results = '';
		for (let j = 1; j < query.length; j++) {
			results += `${query[j].Date.substring(5).replace('-','.')} · ${query[j].Time}h · ${query[j].Project} · ${query[j].Task} · ${query[j].Details}`;
			if (j < query.length - 1) results += '<br><br>'
		}

		string = string.replace(elements[i][0], `<code class="codeBlock" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${results}</code>`);
	}

	return string;
}

//finds HTML tag in string, returns 2 groups: tag start, and text content
//it's important to include the tag start so that we don't end up accidentally replacing identical text somewhere outside the tag
function getElementsInString(string, tag) {
	const isolateElements = new RegExp(`(<${tag}[^>]*?>)(.+?)(?:<\/${tag}>)`, 'gs');
	const elements = [...string.matchAll(isolateElements)];
	return elements;
}

//adds HTML header and applies template to artifact
function formatHTMLPage(artifact) {
	let page = fs.readFileSync(pageTemplatePath, {encoding: 'utf8', flag: 'r'});

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

	if (db.prepare(`SELECT EXISTS(SELECT * FROM Productivity WHERE lower(Project) = '${artifact.name.toLowerCase().replace(/\'/g,"''")}') AS logs`).all()[0].logs > 0 && !artifact.tags.includes('professional') || artifact.name.toLowerCase() == 'home') { //escape single quote by doubling it
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
			startDate = db.prepare("SELECT Date AS start FROM Productivity ORDER BY Date ASC LIMIT 1").all()[0].start.replaceAll('-', '.');
			endDate = db.prepare("SELECT Date AS end FROM Productivity ORDER BY Date DESC LIMIT 2").all()[1].end.replaceAll('-', '.');

			abstract = db.prepare("SELECT SUM(Time) AS abstract FROM Productivity WHERE DIVISION = 'Abstract'").all()[0].abstract;
			audio = db.prepare("SELECT SUM(Time) AS audio FROM Productivity WHERE DIVISION = 'Audio'").all()[0].audio;
			code = db.prepare("SELECT SUM(Time) AS code FROM Productivity WHERE DIVISION = 'Code'").all()[0].code;
			visual = db.prepare("SELECT SUM(Time) AS visual FROM Productivity WHERE DIVISION = 'Visual'").all()[0].visual;
			divisions = [{'hours': abstract, DIV: 'ABS'}, {'hours': audio, DIV: 'AUD'}, {'hours': code, DIV: 'COD'}, {'hours': visual, DIV: 'VIS'}].sort((a, b) => b.hours - a.hours);

			hours = db.prepare("SELECT SUM(Time) AS hours FROM Productivity").all()[0].hours;
			logs = db.prepare("SELECT COUNT(*) AS logs FROM Productivity").all()[0].logs;
			days = db.prepare("SELECT COUNT(DISTINCT(Date)) AS days FROM Productivity").all()[0].days;
			hoursPerDay = (hours / days).toFixed(1);
		} else {
			startDate = db.prepare(`SELECT Date AS start FROM Productivity WHERE lower(Project) = '${a}' ORDER BY Date ASC LIMIT 1`).all()[0].start.replaceAll('-', '.');
			endDate = db.prepare(`SELECT Date AS end FROM Productivity WHERE lower(Project) = '${a}' ORDER BY Date DESC LIMIT 1`).all()[0].end.replaceAll('-', '.');

			abstract = db.prepare(`SELECT SUM(Time) AS abstract FROM Productivity WHERE lower(Project) = '${a}' AND DIVISION = 'Abstract'`).all()[0].abstract;
			audio = db.prepare(`SELECT SUM(Time) AS audio FROM Productivity WHERE lower(Project) = '${a}' AND DIVISION = 'Audio'`).all()[0].audio;
			code = db.prepare(`SELECT SUM(Time) AS code FROM Productivity WHERE lower(Project) = '${a}' AND DIVISION = 'Code'`).all()[0].code;
			visual = db.prepare(`SELECT SUM(Time) AS visual FROM Productivity WHERE lower(Project) = '${a}' AND DIVISION = 'Visual'`).all()[0].visual;
			divisions = [{'hours': abstract, DIV: 'ABS'}, {'hours': audio, DIV: 'AUD'}, {'hours': code, DIV: 'COD'}, {'hours': visual, DIV: 'VIS'}].sort((a, b) => b.hours - a.hours);

			hours = db.prepare(`SELECT SUM(Time) AS hours FROM Productivity WHERE lower(Project) = '${a}'`).all()[0].hours;
			logs = db.prepare(`SELECT COUNT(*) AS logs FROM Productivity WHERE lower(Project) = '${a}'`).all()[0].logs;
			days = db.prepare(`SELECT COUNT(DISTINCT(Date)) AS days FROM Productivity WHERE lower(Project) = '${a}'`).all()[0].days;
			hoursPerDay = (hours / days).toFixed(1);
		}

		sector = divisions[0].DIV;

		let result = '<div class="sideBox">';
		result += `<span class="sideText">${startDate} · ${endDate}</span>`;
		for (let i = 0; i < divisions.length; i++) {
			if (divisions[i].hours != null) {
				const percent = divisions[i].hours / hours * 100;
				result += `<span class="logStat">${divisions[i].DIV}</span><div class="logBar" style="width: calc(${percent}% - ${percent/100 * 30}px);"></div><br>`;
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
			link = 'Graphic';
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
	for (let i = 0; i < artifacts.length; i++) {
		const intersection = artifact.tags.filter(value => artifacts[i].tags.includes(value));
		const filtered = intersection.filter((value) => value !== 'project' && value !== 'nav' && value !== 'debug' && value !== 'research' && value !== 'personal');
		if (filtered.length > 0) {
			if (artifacts[i] == artifact) related += `<span class="sidebarRelatedTitle sidebarRelatedSame">${artifacts[i].title}</span>`;
			else related += `<span class="sidebarRelatedTitle">${artifacts[i].title}</span>`;
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
	page = page.replace(/\$logDays/g, db.prepare("SELECT COUNT(DISTINCT(Date)) AS sum FROM Productivity").get().sum + ' Days<br>')
	page = page.replace(/\$logHours/g, db.prepare("SELECT SUM(Time) AS sum FROM Productivity").get().sum + ' Hours')

	return page;
}

//file data format functions
function normalizeLineEndings(string) {
	return string.replace(/[ \t]*(\r?\n|\r)/g, '\n');
}

function removeComments(string) {
	return string.replace(/[ \t]*(?<![\\:])\/\/.*/g, ''); //keep // preceeded by a \ (escape) or : (colon, useful for links)
}

function trimMultiline(string) {
	return string.replace(/^s+|\s+$/, '');
}

//create database from log csv
const db = new DatabaseSync(':memory:');

db.exec("CREATE TABLE Productivity (Date TEXT, Time TEXT, Project TEXT, Task TEXT, Division TEXT, Details TEXT) STRICT");
const insert = db.prepare("INSERT INTO Productivity (Date, Time, Project, Task, Division, Details) VALUES (?, ?, ?, ?, ?, ?)");

const reader = readline.createInterface({
  input: fs.createReadStream(logPath),
  output: process.stdout,
  console: false,
  terminal: false
});

reader.on('line', (line) => {
	line = line.split(',').map(string => string.trim());

    let result = line.splice(0,5); //avoid splitting apart 'details'
	result.push(line.join(','));
	result[5] = result[5].replace(/"(.*)"/g, '$1'); //remove possible " (double quotes) around 'details'

	insert.run(result[0], result[1], result[2], result[3], result[4], result[5]);
});

reader.on('close', build);

function build() {
	//format file data
	const files = fs.readdirSync(__dirname.concat('/', artifactDirectory), {withFileTypes: true, recursive: true});
	files.filter((file) => file.name.endsWith('.txt')).forEach((file) => {

		const formattedData = new Map();

		let fileContent = fs.readFileSync(file.parentPath.concat('/', file.name), {encoding: 'utf8', flag: 'r'});
		fileContent = removeComments(normalizeLineEndings(fileContent));

		let [headerData, contentData] = fileContent.split(/\s*===\s*/).map((part) => trimMultiline(part));
		headerData.split(/\n+/).forEach((headerLine) => formattedData.set(...headerLine.split(/\s*:\s*(.*)/, 2)));

		formattedData.set('lastModified', fs.statSync(file.parentPath + '/' + file.name).mtime);
		formattedData.set('content', contentData);

		artifacts.push(Object.fromEntries(formattedData));
	});

	//format artifact data
	for (let i = 0; i < artifacts.length; i++) {
		//image
		if (artifacts[i].image != null) artifacts[i].image = encodeURI(imageDirectory + artifacts[i].image).replace(/'/g, "\\'");

		//links
		if (artifacts[i].links != null) {
			artifacts[i].links = artifacts[i].links.split(',');
			for (let j = 0; j < artifacts[i].links.length; j++) {;
				artifacts[i].links[j] = artifacts[i].links[j].replace(/!\[(.*)]\((.*)\)/g, `$1,${fileDirectory}$2`); //![]() is a file link
				artifacts[i].links[j] = artifacts[i].links[j].replace(/\[(.*)]\((.*)\)/g, '$1,$2');
				artifacts[i].links[j] = artifacts[i].links[j].split(',').map(string => string.trim());
			}
			artifacts[i].links = artifacts[i].links.sort();	
		}

		//tags
		artifacts[i].tags = artifacts[i].tags.split(',').map(string => string.trim()).sort();
	}

	//first parse
	for (let i = 0; i < artifacts.length; i++) {
		artifacts[i].title = parse(artifacts[i].title, 'title');
		artifacts[i].content = parse(artifacts[i].content, 'content');
		artifacts[i].imageName = parse(artifacts[i].imageName, 'imageName');
	}

	//second parse
	for (let i = 0; i < artifacts.length; i++) {
		artifacts[i].content = secondParse(artifacts[i].content, 'content');
	}

	//write .html files
	for (let i = 0; i < artifacts.length; i++) {
		fs.writeFileSync(__dirname.concat('/dist/', artifacts[i].name.toLowerCase(), '.html'), formatHTMLPage(artifacts[i]));
	}

	//copy assets to /dist folder
	fs.cpSync('assets/styles', 'dist/assets/styles', {recursive: true});
	fs.cpSync('assets/scripts', 'dist/assets/scripts', {recursive: true});
	fs.cpSync('assets/ui', 'dist/assets/ui', {recursive: true});
	fs.copyFile('assets/htaccess/.htaccess', 'dist/.htaccess', () => {});
}