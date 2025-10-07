/*

Holds global variables and adjustable parameters.

*/

import {DatabaseSync} from 'node:sqlite';

class Globals {
    constructor() {
        this.root = 'https://v-os.nyc3.cdn.digitaloceanspaces.com';
        this.fileDirectory = this.root + '/files/';
        this.imageDirectory = this.root + '/images/';
        this.soundDirectory = this.root + '/sounds/';
        this.videoDirectory = this.root + '/videos/';

        this.logPath = 'assets/log/Productivity.csv';
        this.pageTemplatePath = 'assets/html/page.html';
        this.artifactDirectory = 'artifacts';

        this.artifacts = [];

        this.db = new DatabaseSync(':memory:');
    }
}

const globals = new Globals();
export {globals};