
/*
 * GET podcast
 */

 var $ = require('node-jquery');
 var http = require('http');
 var Q = require('q');
 var jade = require('jade');
 var fs=require('fs');

 var PBS_HOST = 'pbsfm.org.au';
 var AUDIO = '/audio';
 var SAVE_PATH = './cache/';
 var TEMPLATE_PATH = './views/podcast.jade';
 var PROGRAM_LIST = '/programlist';
 var jadeTemplate = fs.readFileSync(TEMPLATE_PATH);


// create cache folder
if (!fs.existsSync(SAVE_PATH)) {
	fs.mkdirSync(SAVE_PATH);
}


// handle request for podcast by serving up the appropriate xml file
exports.get = function(req, res) {
	var programId = req.params.id; // e.g. 'acrossthetracks'
	var filePath = SAVE_PATH + programId + '.xml';
	if (fs.existsSync(filePath)) {
		res.sendfile(filePath);
	}
	else {
		res.send('not found');
	}
}

// scrape program list and cache xml for all
// http://stackoverflow.com/questions/18153410/how-to-use-q-all-with-complex-array-of-promises was some help
exports.getAll = function() {
	console.log('getting all episodes ');
	httpGet(PBS_HOST, PROGRAM_LIST)
	.then(function(htmlString){
		var $html = $(htmlString);
		var selector = '.view-programs-active-list td';
		var descriptionSelector = 'div.views-field-field-presenter-value span';
		var $programList = $html.find(selector);
		var programData = [];
		var programPromises = [];
		$programList.each(function() {
			var program = {};
			program.href = $(this).find('a').attr('href');
			program.name = $(this).find('a').html();
			program.description = $(this).find(descriptionSelector).html();
			// only include if there is an href
			if (undefined != program.href) {
				programData.push(program);
				var programPromise = getPodCast(program.href).then (function(xmlString) {
					var podcastSavePath = SAVE_PATH + program.href+'.xml';
					console.log('writing to '+podcastSavePath);
					fs.writeFileSync(SAVE_PATH + program.href+'.xml', xmlString);
				});
			}
		});
		Q.all(programPromises).then(function(){
			console.log('got all episodes ');
		})
	})
}


// assemble podcast for a given program. return promise that returns htmlString
var getPodCast = function(programId) {
	var deferred = Q.defer();
	var podcastResult = {};
	var episodes;


	console.log('getting audio for: '+PBS_HOST+programId);
	httpGet(PBS_HOST, '/'+programId)
		.then(function(htmlString) {
			podcastResult = extractProgramDetails(htmlString);
		}).then (httpGet(PBS_HOST, '/'+programId+ AUDIO)
		.then(function(htmlString){
	        episodes = extractEpisodeData(htmlString);
			console.log('extracted data for '+ episodes.length+ ' items');
			var episodePromises = [];
			episodes.forEach(function(episode) {
				var episodePromise = httpGet(PBS_HOST, episode.pageUrl).then(function(htmlString) {
					episode.url = extractUrl(htmlString);
					episode.link = PBS_HOST + episode.pageUrl;//"<![CDATA[" and ends with "]]>"
					episode.description = $(htmlString).find('#block-views-playlists_pgm_audio-block_1 .field-content').text();
					episode.duration = '0';
					return(episode);
				});
				episodePromises.push(episodePromise);
			});
			Q.all(episodePromises).then(function(episodeResults) {
				// all the episode promises have been fulfilled
				podcastResult.items = episodeResults;
				podcastResult.language = 'en-au';
				// TODO render Jade template
				var options = {pretty: true};
				var jadeFunction = jade.compile(jadeTemplate, options);
				var podCastString = jadeFunction(podcastResult);
				podCastString = podCastString.replace(/lynk/g, 'link');
				podCastString = podCastString.replace(/<guid>"/g, '<guid>');
				podCastString = podCastString.replace(/"<\/guid>/g, '</guid>');
			    deferred.resolve(podCastString);
			});
		}));
    return deferred.promise;
}


// httpGetPromise - takes a host+path, returns a promise
//adapted from http://veebdev.wordpress.com/2012/02/26/node-js-http-get-example-does-not-work-here-is-fix/
// promise stuff from http://runnable.com/Uld6VcWt6UEaAAHR/combine-promises-with-q-for-node-js
var httpGet = function(host, path) {
	//console.log('httpGet '+ path);
	var deferred = Q.defer();
	http.get({ host: PBS_HOST, path: path+'?'+new Date().getTime()}, function(response) {
		var htmlString = '';
	    if (response.statusCode === 302) {
	        var newLocation = url.parse(response.headers.location).host;
	        console.log('We have to make new request ' + newLocation);
	        request(newLocation);
	    } else {
	        console.log("Response: %d", response.statusCode);
	        response.on('data', function(data) {
	            htmlString += data;
	        });
	        response.on('end', function() {
			    deferred.resolve(htmlString);
	        });
	    }
    }).on('error', function(err) {
        console.log('Error %s', err.message);
    });
    return deferred.promise;
}

// return episode data from program page html
var extractEpisodeData = function(htmlString) {
	var $html = $(htmlString);
	var selector =  '.node.node-teaser.node-type-story a';
	var $episodeList = $html.find(selector);
	var episodes = [];
	$episodeList.each(function(){
		var episode = {};
		episode.title = $(this).html();
		episode.pageUrl = $(this).attr('href');
		episode.pubDate = episode.title .split('for ')[1];// yes i know
		episodes.push(episode);
	});
	episodes.reverse();
	return episodes;
}
/**
* Extract the program details from the progrmam list page
**/
var extractProgramDetails = function(htmlString) {
	var result = {};
	var emailSelector = 'a[href^="mailto:"]';
	var descriptionSelector = '#content-area .field-content';
	var imageSelector = '#content-area .field-content img';
	var titleSelector = '#content h1.title';
	result.email = $(htmlString).find(emailSelector).html();
	result.title = $(htmlString).find(titleSelector).text();
	result.description = $(htmlString).find(descriptionSelector).text();
	result.imageUrl = $(htmlString).find(imageSelector).attr('src');
	return result;
}

/**
* Extract the actual episode audio url from the page
**/
var extractUrl = function(htmlString) {
	var drupalSettings = JSON.parse(htmlString.split('jQuery.extend(Drupal.settings, ')[2].split(');')[0]); // extremely fragile way to get this info - a regExp would be better
	return drupalSettings.jwplayer.files['jwplayer-2'].file;
}