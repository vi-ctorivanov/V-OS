/*

Takes all .txt artifact files, parses them, and outputs an .html page for each.

*/

import {globals} from './assets/bundle/globals.js';
import {parse, secondParse} from './assets/bundle/parser.js';
import {formatHTMLPage} from './assets/bundle/formatter.js';

import * as fs from 'node:fs';
import * as readline from 'node:readline';

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
globals.db.exec("CREATE TABLE Productivity (Date TEXT, Time TEXT, Project TEXT, Task TEXT, Division TEXT, Details TEXT) STRICT");
const insert = globals.db.prepare("INSERT INTO Productivity (Date, Time, Project, Task, Division, Details) VALUES (?, ?, ?, ?, ?, ?)");

const reader = readline.createInterface({
	input: fs.createReadStream(globals.logPath),
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
	const files = fs.readdirSync(globals.artifactDirectory, {withFileTypes: true, recursive: true});
	files.filter((file) => file.name.endsWith('.txt')).forEach((file) => {

		const formattedData = new Map();

		let fileContent = fs.readFileSync(file.parentPath.concat('/', file.name), {encoding: 'utf8', flag: 'r'});
		fileContent = removeComments(normalizeLineEndings(fileContent));

		let [headerData, contentData] = fileContent.split(/\s*===\s*/).map((part) => trimMultiline(part));
		headerData.split(/\n+/).forEach((headerLine) => formattedData.set(...headerLine.split(/\s*:\s*(.*)/, 2)));

		formattedData.set('lastModified', fs.statSync(file.parentPath + '/' + file.name).mtime);
		formattedData.set('content', contentData);

		globals.artifacts.push(Object.fromEntries(formattedData));
	});

	//format artifact data
	for (let i = 0; i < globals.artifacts.length; i++) {
		//image
		if (globals.artifacts[i].image != null) globals.artifacts[i].image = encodeURI(globals.imageDirectory + globals.artifacts[i].image).replace(/'/g, "\\'");

		//links
		if (globals.artifacts[i].links != null) {
			globals.artifacts[i].links = globals.artifacts[i].links.split(',');
			for (let j = 0; j < globals.artifacts[i].links.length; j++) {;
				globals.artifacts[i].links[j] = globals.artifacts[i].links[j].replace(/!\[(.*)]\((.*)\)/g, `$1,${globals.fileDirectory}$2`); //![]() is a file link
				globals.artifacts[i].links[j] = globals.artifacts[i].links[j].replace(/\[(.*)]\((.*)\)/g, '$1,$2');
				globals.artifacts[i].links[j] = globals.artifacts[i].links[j].split(',').map(string => string.trim());
			}
			globals.artifacts[i].links = globals.artifacts[i].links.sort();	
		}

		//tags
		globals.artifacts[i].tags = globals.artifacts[i].tags.split(',').map(string => string.trim()).sort();
	}

	//first parse
	for (let i = 0; i < globals.artifacts.length; i++) {
		globals.artifacts[i].title = parse(globals.artifacts[i].title, 'title');
		globals.artifacts[i].content = parse(globals.artifacts[i].content, 'content');
		globals.artifacts[i].imageName = parse(globals.artifacts[i].imageName, 'imageName');
	}

	//second parse
	for (let i = 0; i < globals.artifacts.length; i++) {
		globals.artifacts[i].content = secondParse(globals.artifacts[i].content, 'content');
	}

	//write .html files
	if (!fs.existsSync('./dist')) fs.mkdirSync('./dist');
	
	for (let i = 0; i < globals.artifacts.length; i++) {
		fs.writeFileSync(`dist/${globals.artifacts[i].name.toLowerCase()}.html`, formatHTMLPage(globals.artifacts[i]));
	}

	//copy assets to /dist folder
	fs.cpSync('assets/styles', 'dist/assets/styles', {recursive: true});
	fs.cpSync('assets/scripts', 'dist/assets/scripts', {recursive: true});
	fs.cpSync('assets/ui', 'dist/assets/ui', {recursive: true});
	fs.copyFile('assets/htaccess/.htaccess', 'dist/.htaccess', () => {});

	globals.db.close();
}