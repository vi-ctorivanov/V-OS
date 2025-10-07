/*

Parses artifact data using mostly regex into html.

*/

import {globals} from './globals.js';

export function parse(string, type) {
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
		[/(?<!\\)\!\[([^\]]+)\]\(([^)]+)(\.png|\.jpg|\.gif)\)/g, `<img class="textImage" src="${globals.imageDirectory}$2$3" alt="$1">`], //image, supports PNG, JPG, and GIF
		[/(?<!\\)\!\[([^\]]+)\]\(([^)]+)(\.mp4|\.mov)\)/g, `<video class="video" controls="" src="${globals.videoDirectory}$2$3" alt="$1"></video>`], //video, supports MP4 and MOV
		[/(?<!\\)\!\[([^\]]+)\]\(([^)]+)(\.mp3|\.wav)\)/g, `<audio class="audio" controls=""><source src="${globals.soundDirectory}$2$3" alt="$1"></audio>`], //audio, supports MP3 and WAV
		[/(?<!\\)\!\[([^\]]+)\]\(([^)]+)(\.*?)\)/g, `<a href="${globals.fileDirectory}$2$3" alt="$1">$1</a>`], //files

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
export function secondParse(string) {
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

	globals.artifacts.forEach(artifact => {
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
		for (let i = 0; i < globals.artifacts.length; i++) {
			if (globals.artifacts[i].name.toLowerCase() === href.toLowerCase()) artifact = globals.artifacts[i];
		}
		if (artifact != null) string = string.replace(elements[i][1], `<div class="pageCard"><a href="${href}" class="pageCardImage" href="${href}" style="background-image:url(${artifact.image})"></a><div class="pageCardTitle"><span>${artifact.title}</span></div></div>`);
	}

	return string;
}

//builds styled link list of recently updated pages
function getRecentlyUpdatedPages(string) {
	const elements = [...string.matchAll(/(<div recentlyUpdatedPages="([^"]*?)"><\/div>)/gs)];

	let sortedArtifacts = globals.artifacts.slice().sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()); //avoid changing original array
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

		let query = globals.db.prepare(`SELECT * FROM Productivity LIMIT ${entries}`).all();

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