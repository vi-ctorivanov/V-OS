<?php global $artifact;?>

<!DOCTYPE html>

<html lang="en">
<head>
	<meta charset="UTF-8">
	<title><?php echo ucfirst($artifact->attributes['name']);?></title>

	<meta name="viewport" content="width=device-width, initial-scale=0.8">

	<meta name="robots" content="index, follow">

	<meta property="og:url" content="https://v-os.ca/<?php echo rawurlencode(ucfirst($artifact->attributes['name'])); ?>">
	<meta property="og:title" content="<?php echo ucfirst($artifact->attributes['name']); ?>">
	<meta property="og:type" content="website">
	<meta property="og:description" content="<?php echo strip_tags($artifact->attributes['title']); ?>">
	<meta property="og:image" content="<?php echo 'https://v-os.ca/'.$artifact->attributes['image']; ?>">

	<meta name="twitter:url" content="https://v-os.ca/<?php echo rawurlencode(ucfirst($artifact->attributes['name'])); ?>">
	<meta name="twitter:title" content="<?php echo ucfirst($artifact->attributes['name']); ?>">
	<meta name="twitter:card" content="summary">
	<meta name="twitter:description" content="<?php echo strip_tags($artifact->attributes['title']); ?>">
	<meta name="twitter:image" content="<?php echo 'https://v-os.ca/'.$artifact->attributes['image']; ?>">

	<meta name="description" content="<?php echo strip_tags($artifact->attributes['title']); ?>">

	<meta name="keywords" content="victor ivanov, vi, v, vos, v os, v-os, artist, developer, montreal, canada, tokyo, japan, wiki, digital art, video games, portfolio">

	<meta name="author" content="Victor Ivanov">
	
	<link rel='icon' href='https://v-os.ca/assets/ui/v_ico.ico' type='image/x-icon'>

	<link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/5.0.0/normalize.css">
	<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Merriweather:400,400i,900|Roboto:400,400i,700|Roboto+Mono">
	<link rel="stylesheet" type="text/css" href="/assets/styles/style.css?>">
</head>

<body>
	<div id="mouseFar"></div>
	<?php echo getSectorIcon($artifact, 'mouseIcon');?>

	<div id="header">
		<div id="header-bar">
			<span class="header-title"><?php echo $artifact->attributes['image name'];?></span>
			<?php echo getSectorIconLink($artifact, 'header-sector', false);?>

			<a href="home">
				<canvas id="vCanvas" width="400" height="400"></canvas>
			</a>
		</div>

		<div class="header-image" style="background-image: url(<?php echo $artifact->attributes['image'];?>)"></div>
	</div>

	<div id="no-page-header"></div>

	<div id="body">
		<div id="full-container">
			<div id="sidebar">
				<?php
				if ($artifact->path) {
					echo '<div class="path-container">';
					echo $artifact->path;
					echo '</div>';
				}
				?>

				<?php
				echo '<div class="side-divider"></div>';

				if ($data = getLogData()) {
					echo '<div class="side-box">';
					echo $data;
					echo '</div>';
					echo '<div class="side-divider"></div>';
				}
				?>

				<?php
				if ($artifact->links) {
					for ($i = 0; $i < sizeof($artifact->links); $i++) {
						echo $artifact->links[$i];
					}
					echo '<div class="side-divider" style="margin-top: 16px"></div>';
				}
				?>

				<?php
				if ($related = getRelated($artifact, false, null, 'sidebar-related-title', 'sidebar-related-same')) {
					$dir = $artifact->brokenPath[sizeof($artifact->brokenPath) - 2];
					echo '<span class="side-title"><a href="'. $dir .'">'. ucfirst($dir) .'</a></span>';
					echo $related;
					echo '<div class="side-divider"></div>';
				}
				?>

				<?php
				if ($artifact->formattedTags) {
					for ($i = 0; $i < sizeof($artifact->formattedTags); $i++) {
						echo $artifact->formattedTags[$i];
					}
					echo '<div class="side-divider" style="margin-top: 16px"></div>';
				}
				?>

				<?php
				if ($artifact->lastModifiedStamp) {
					echo '<span>Last Modified: ' . Date('Y.m.d', $artifact->lastModifiedStamp) . '</span>';
					echo '<div class="side-divider" style="margin-top: 16px"></div>';
				}
				?>

				<a class="neutral-link" href="https://github.com/vi-ctor-vi">Github</a> ·
				<a class="neutral-link" href="https://www.linkedin.com/in/victor-ivanov/">LinkedIn</a> ·
				<a class="neutral-link" href="https://vi-ctor-vi.bandcamp.com/releases">Bandcamp</a>
				<br>
				<br>
				<a class="neutral-link" href="mailto:vi@v-os.ca">vi@v-os.ca</a>
			</div><div id="body-content">

				<div id="mobile-path">
					<?php echo $artifact->path;?>
				</div>

				<div id="title">
					<h1><?php echo $artifact->attributes['title']?></h1>
				</div>

				<div class="divider" style="transform: translateX(0)"></div>

				<div id="content">
					<?php echo $artifact->attributes['content'];?>
				</div>

			</div>
		</div>
	</div>

	<div id="footer">
		<div id="footer-content">
			<span class="footer-left">
				<a class="neutral-link" href="https://v-os.ca/portfolio">Victor Ivanov</a>
				<br>
				<a class="neutral-link" href="https://v-os.ca/home">V-OS</a>
			</span>

			<?php echo getSectorIconLink($artifact, 'footer-center', true);?>

			<span class="footer-right">
				<?php echo '<span class="neutral-text">'.getAllDays(null, null);?> days</a><br>
				<?php echo '<span class="neutral-text">'.getAllHours(null, null);?> hours</a><br>
			</span>
		</div>
	</div>

<script src="/assets/scripts/logo.js"></script>
<script src="/assets/scripts/mouse.js"></script>
<script src="/assets/scripts/requestscript.js"></script>

<?php checkWhite($artifact, false);?>
<?php checkImage($artifact);?>

</body>
</html>