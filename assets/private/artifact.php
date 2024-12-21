<?php
/*
Artifact is a data structure meant to hold a variety of properties and content describing a page.
The formatting of its attributes is done through the parser, to keep artifacts as minimal as possible.

Technically, an artifact has the capacity to carry any single-data attribute by simply adding it to the $attributes array.
The new attribute's formatting, of course, must be implemented into the parser, however.
*/
class Artifact {
	//list of attributes to check for in the file
	public $attributes = array(
		'name'=>'',
		'image'=>'',
		'image name'=>'',
		'title'=>'',
		'content'=>'',
		'white'=>''
	);

	//tags carries a selection of tags, which can be used for grouping and organizational purposes. the array is retrieved from first to last - most important to least important
	public $tags = array();

	//formatted tags contain tags made for display
	public $formattedTags = array();

	//links carries a set of links and their respective name associations
	public $links = array();

	//path carries the directory path of the file
	public $path = array();

	//pure path array, no styling
	public $brokenPath = array();

	//last modified time in unix timestamp
	public $lastModifiedStamp = null;

	//constructor parses file to retrieve its contents
	public function __construct($filePath, $brokenPath) {

		//get file contents
		$file = fopen($filePath, 'r');

		if ($file) {
			$currentKey = null;

			while (($line = fgets($file)) !== false) {

				$multiline = true;

				//skip lines starting with '//' and empty lines
				if ((substr($line, 0, 2)) === '//' || trim($line) === '') continue;

				//get tags and links (unique retrieval due to it being an array)
				if (substr($line, 0, 5) === 'tags:') {
					$this->tags = explode(',', trim(substr($line, 5, strlen($line))));
					$multiline = false;
				} else if (substr($line, 0, 6) === 'links:') {
					$this->links = explode(',', trim(substr($line, 6, strlen($line))));
					$multiline = false;
				} else {
					//go through each attribute and see if line begins with its declaration
					foreach ($this->attributes as $key => $value) {
						if (substr($line, 0, strlen($key) + 1) === $key.':') {
							//once key has been found, update $currentKey, and get the line's value
							$currentKey = $key;
							$value = trim(substr($line, strlen($currentKey) + 1, strlen($line)));
							
							$multiline = false;
							if ($value === '') continue;
							$this->attributes[$currentKey] = $value;
						}
					}
				}

				//if key wasn't found, continue adding to the previously acquired attribute
				if ($multiline && $currentKey != null) {
					if (substr($line, 0, 1) === '+' && substr($line, 1, 1) !== ' ' && substr($line, 1, 1) !== '+') $this->attributes[$currentKey] = $this->attributes[$currentKey].'<br>';
					else $this->attributes[$currentKey] = $this->attributes[$currentKey].$line;
				}
			}
		}
		fclose($file);

		//generate path
		array_pop($brokenPath); //remove filename
		array_shift($brokenPath); //remove pages directory
		array_push($brokenPath, $this->attributes['name']); //add page name 
		$this->path = $brokenPath;

		//get file's last modified timestamp
		$this->lastModifiedStamp = date(filemtime($filePath));
	}

	//returns true if artifact has tag ($string)
	public function hasTag($string) {
		for ($i = 0; $i < sizeof($this->tags); $i++) {
			if (strtolower($this->tags[$i]) === strtolower($string)) return true;
		}
		return false;
	}
}

//creates all artifacts by passing artifact constructor the artifact declaration file
function createArtifacts() {
	global $artifacts;
	global $pageDirectory;

	$files = getDirContents($pageDirectory.DIRECTORY_SEPARATOR);

	for ($i = 0; $i < sizeof($files); $i++) {
		//get extension
		$info = pathinfo($files[$i], PATHINFO_EXTENSION);

		//check if txt
		if ($info === 'txt') {
			$path = explode(DIRECTORY_SEPARATOR, $files[$i]);
			$name = $path[sizeof($path) - 1];
			$file = '';

			//add delimiter back into path directories
			for ($j = 0; $j < sizeof($path) - 1; $j++) {
				$path[$j] = $path[$j] . DIRECTORY_SEPARATOR;
			}

			//get path to pages directory, backwards
			for ($j = sizeof($path) - 1; $j > 0; $j--) {
				$file = $path[$j] . $file;

				//for non-root path, get directories before pages directory
				$pageDirectoryExploded = explode(DIRECTORY_SEPARATOR, $pageDirectory);
				$pageDirectoryName = $pageDirectoryExploded[sizeof($pageDirectoryExploded) - 1];
				array_pop($pageDirectoryExploded);

				$pageDirectoryPrePath = implode(DIRECTORY_SEPARATOR,$pageDirectoryExploded);
				if ($pageDirectoryPrePath) {
					$pageDirectoryPrePath = $pageDirectoryPrePath . DIRECTORY_SEPARATOR;
				}

				//if found pages directory, push to artifacts array
				if ($path[$j] === $pageDirectoryName . DIRECTORY_SEPARATOR) {
					$brokenPath = explode(DIRECTORY_SEPARATOR, $file);
					$newArtifact = new Artifact($pageDirectoryPrePath . $file, $brokenPath);
					array_push($artifacts, $newArtifact);
					$newArtifact->brokenPath = $brokenPath;
					break;
				}
			}

		} else {
			continue;
		}
	}
}

//custom comparison for ordering artifacts by name
function artifactComparison($a, $b) {
    return strcmp(strtolower($a->attributes['name']), strtolower($b->attributes['name']));
}

//goes through all artifacts and uses parser to format their attributes
function formatArtifacts() {
	global $artifacts;
	global $parser;

	//sort artifacts alphabetically
	usort($artifacts, 'artifactComparison');

	if ($parser && $artifacts) {
		for ($i = 0; $i < sizeof($artifacts); $i++) {
			$parser->firstFormat($artifacts[$i]);
		}
		for ($i = 0; $i < sizeof($artifacts); $i++) {
			$parser->secondFormat($artifacts[$i]);
		}
	}
}

//finds artifact by name
function getArtifact($string) {
	global $artifacts;

	if ($artifacts) {
		for ($i = 0; $i < sizeof($artifacts); $i++) {
			if (strtolower($artifacts[$i]->attributes['name']) === strtolower($string)) {
				return $artifacts[$i];
			}
		}
	}
	return null;
}

//get contents of directory
function getDirContents($dir, &$results = array()){
	$files = scandir($dir);

	foreach($files as $key => $value){
	$path = realpath($dir.DIRECTORY_SEPARATOR.$value);
		if(!is_dir($path)) {
			$results[] = $path;
		} else if($value != "." && $value != "..") {
			getDirContents($path, $results);
			$results[] = $path;
		}
	}

	return $results;
}

//intelligently get pages in same directory if navigation pages, and pages with same 'lead' tag if end-page / content page
function getRelated($artifact, $getName, $nameStyle, $titleStyle, $sameStyle) {
	global $artifacts;

	if (sizeof($artifact->brokenPath) == 2) {
		return null;
	}

	$location = $artifact->brokenPath[sizeof($artifact->brokenPath) - 2];
	$tag = $artifact->tags[sizeof($artifact->tags) - 1];
	$contents = '';

	for ($i = 0; $i < sizeof($artifacts); $i++) {
		if ($artifacts[$i]->hasTag('error')) continue;

		//if navigation page, include pages in same directory
		if ($artifact->hasTag('nav')) {
			if ($artifacts[$i]->brokenPath[sizeof($artifacts[$i]->brokenPath) - 2] == $location) {
				if ($artifacts[$i] == $artifact) {
					if ($getName) $contents += '<span class="'. $nameStyle .' '. $sameStyle .'">'. $artifacts[$i]->attributes['name'] .'</span>';
					$contents = $contents .'<span class="'. $titleStyle .' '. $sameStyle .'">'. $artifacts[$i]->attributes['title'] .'</span>';
				} else {
					if ($getName) $contents += '<span class="'. $nameStyle .'">'. $artifacts[$i]->attributes['name'] .'</span>';
					$contents = $contents .'<span class="'. $titleStyle .'">'. $artifacts[$i]->attributes['title'] .'</span>';
				}
			}
		//if content page, include pages with same leading tag OR ones in same folder
		} else if ($artifacts[$i]->brokenPath[sizeof($artifacts[$i]->brokenPath) - 2] == $location || $artifacts[$i]->hasTag($tag)) {
			if ($artifacts[$i] == $artifact) {
				if ($getName) $contents += '<span class="'. $nameStyle .' '. $sameStyle .'">'. $artifacts[$i]->attributes['name'] .'</span>';
				$contents = $contents .'<span class="'. $titleStyle .' '. $sameStyle .'">'. $artifacts[$i]->attributes['title'] .'</span>';
			} else {
				if ($getName) $contents += '<span class="'. $nameStyle .'">'. $artifacts[$i]->attributes['name'] .'</span>';
				$contents = $contents .'<span class="'. $titleStyle .'">'. $artifacts[$i]->attributes['title'] .'</span>';
			}
		}
	}

	return $contents;
}

function getSectorIconLink($artifact, $style, $forceWhite) {
	$isRes = false;
	$isAud = false;
	$isVis = false;
	$isCod = false;
	$isWri = false;
	$isPro = false;

	$path = $artifact->brokenPath;
	//remove file extension
	$path[sizeof((array)$path) - 1] = substr($path[sizeof((array)$path) - 1], 0, sizeof((array)$path[sizeof((array)$path) - 1]) - 5);

	for ($i = 0; $i < sizeof($path); $i++) {
		if (trim($path[$i]) == 'research') $isRes = true;
		if (trim($path[$i]) == 'audio') $isAud = true;
		if (trim($path[$i]) == 'visual') $isVis = true;
		if (trim($path[$i]) == 'code') $isCod = true;
		if (trim($path[$i]) == 'writing') $isWri = true;
		if (trim($path[$i]) == 'professional') $isPro = true;
	}
	
	echo '<a href="';
	if ($isRes) echo 'research';
	else if ($isAud) echo 'audio';
	else if ($isVis) echo 'visual';
	else if ($isCod) echo 'code';
	else if ($isWri) echo 'writing';
	else if ($isPro) echo 'professional';
	else echo 'home';
	echo '">';

	echo '<img class="'. $style .'" src="assets/ui/';
	if ($isRes) echo 'abs';
	else if ($isAud) echo 'aud';
	else if ($isVis) echo 'vis';
	else if ($isCod) echo 'cod';
	else if ($isWri) echo 'wri';
	else if ($isPro) echo 'pro';
	else echo 'def';

	if ($forceWhite) {
		echo '_w.svg"></img></a>';
	} else {
		if (checkWhite($artifact, true)) echo '_w.svg"></img></a>';
		else echo '.svg"></img></a>';
	}
}

function getSectorIcon($artifact, $style) {
	$isRes = false;
	$isAud = false;
	$isVis = false;
	$isCod = false;
	$isWri = false;
	$isPro = false;

	$path = $artifact->brokenPath;
	//remove file extension
	$path[sizeof((array)$path) - 1] = substr($path[sizeof((array)$path) - 1], 0, sizeof((array)$path[sizeof((array)$path) - 1]) - 5);

	for ($i = 0; $i < sizeof($path); $i++) {
		if (trim($path[$i]) == 'research') $isRes = true;
		if (trim($path[$i]) == 'audio') $isAud = true;
		if (trim($path[$i]) == 'visual') $isVis = true;
		if (trim($path[$i]) == 'code') $isCod = true;
		if (trim($path[$i]) == 'writing') $isWri = true;
		if (trim($path[$i]) == 'professional') $isPro = true;
	}
	
	echo '<img id="'. $style . '" src="/assets/ui/'; 
	if ($isRes) echo 'abs';
	else if ($isAud) echo 'aud';
	else if ($isVis) echo 'vis';
	else if ($isCod) echo 'cod';
	else if ($isWri) echo 'wri';
	else if ($isPro) echo 'pro';
	else echo 'def';
	echo '.svg">';
}

//makes header information white
function checkWhite($artifact, $check) {
	if (!$check) {
		if ($artifact->attributes['white'] == 'true') {
			echo
			'<style>
			.header-title, .header-link {
				color: #fff;
			}
			.long-divider {
				background-color: #fff;
			}
			.header-title:hover {
				background-color: #777;
			}
			</style>

			<script>
			V.colorR = 255;
			V.colorG = 255;
			V.colorB = 255;
			</script>';
		}
	} else {
		if ($artifact->attributes['white'] == 'true') return true;
		else return false;
	}
}

function checkImage($artifact) {
	if (!$artifact->attributes['image']) {
		echo
		'<style>
		#header {
			display: none;
		}
		#no-page-header {
			display: block;
		}
		#userCanvas {
			position: absolute;
		}
		</style>

		<script>
		V.colorR = 255;
		V.colorG = 255;
		V.colorB = 255;
		</script>';
	}
}

//custom comparison for ordering artifacts by timestamp
function stampComparison($a, $b) {
	return ($a->lastModifiedStamp > $b->lastModifiedStamp) ? -1 : 1;
}

//return links to most recently modified non-nav pages
function getMostRecent($count) {
	global $artifacts;

	$sortedArtifacts = $artifacts;

	if ($artifacts) {
		usort($sortedArtifacts, 'stampComparison');

		$recent = array();
		$i = 0;

		while (sizeof($recent) < $count) {
			//disregard any navigation pages
			if (!$sortedArtifacts[$i]->hasTag('nav') && !$sortedArtifacts[$i]->hasTag('hub') && !$sortedArtifacts[$i]->hasTag('test')) {
				array_push($recent, $sortedArtifacts[$i]);
			}
			$i++;
		}

		$result = '';

		for ($i = 0; $i < sizeof($recent); $i++) {
			$result = $result .'/['.$recent[$i]->attributes['name'].']';
		}

		return $result;
	}
}
?>