
/*
 * GET podcast
 */

 var $ = require('node-jquery');

 var http = require('http');

 var Q = require('q');

 var root = 'pbsfm.org.au';

 var AUDIO = '/audio';
// http://stackoverflow.com/questions/18153410/how-to-use-q-all-with-complex-array-of-promises was some help
exports.get = function(req, res){
	var programId = req.params.id; // e.g. 'acrossthetracks'
	// id could be as simple as the url, e.g. 'acrossthetracks'
	// this would mean refetching the page and starting from scratch
	// alternatively we could send the stringified program data?

	// alternatively we could also construct the index page server-side
	var podcastResult = {};


	console.log('getting audio for: '+root+programId);
	httpGet(root, '/'+programId)
		.then(function(htmlString) {
			podcastResult = extractProgramDetails(htmlString);
		}).then (httpGet(root, '/'+programId+ AUDIO)
		.then(function(htmlString){
	        podcastResult.items = extractEpisodeData(htmlString);
			//console.log('got items '+podcastResult.items.length);
			// create chain of promises for each episode to fetch the audio url
			var episodePromises = [];
			podcastResult.items.forEach(function(episode) {
				console.log('promise for episode '+episode.pageUrl);
				var episodePromise = httpGet(root, episode.pageUrl).then(function(htmlString) {
					episode.url = extractUrl(htmlString);
					episode.link = root+'/'+programId+ AUDIO;
					episode.description = extractDescription(htmlString);
					episode.duration = '0';
					//console.log('got ' + episode.name);
				});
				episodePromises.push(episodePromise);
			});
			Q.all(episodePromises)
				.then(function(result) {
					// all the episode promises have been fulfilled
					console.log('all done');
					//console.log(Q.isPromise(result[0]));// this is false = why??
					podcastResult.language = 'en-au';
					  res.render('podcast', podcastResult);// render into jade
				});
		}));
};


// httpGetPromise - takes a host+path, returns a promise
//adapted from http://veebdev.wordpress.com/2012/02/26/node-js-http-get-example-does-not-work-here-is-fix/
// promise stuff from http://runnable.com/Uld6VcWt6UEaAAHR/combine-promises-with-q-for-node-js
var httpGet = function(host, path) {
	console.log('httpGet '+ path);
	var deferred = Q.defer();
	http.get({ host: root, path: path}, function(response) {
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
	console.log('deferred '+ deferred);
    return deferred.promise;
}

// return episode data from program page html
var extractEpisodeData = function(htmlString) {
	var $html = $(htmlString);
	var selector =  '.node.node-teaser.node-type-story a';
	var $episodeList = $html.find(selector);
	var episodes = [];
	$episodeList.each(function(){
		var episodeData = {};
		episodeData.title = $(this).html();
		episodeData.pageUrl = $(this).attr('href');
		episodeData.link = null;
		episodes.push(episodeData);
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
	var descriptionSelector = '.view-content .field-content';
	var titleSelector = '#content h1.title';
	result.email = $(htmlString).find(emailSelector).html();
	result.title = $(htmlString).find(titleSelector).text();
	result.description = $(htmlString).find(descriptionSelector).text();
	return result;
}

/**
* Extract the actual episode audio url from the page
**/
var extractUrl = function(htmlString) {
	var drupalSettings = JSON.parse(htmlString.split('jQuery.extend(Drupal.settings, ')[2].split(');')[0]); // extremely fragile way to get this info - a regExp would be better
	return drupalSettings.jwplayer.files['jwplayer-2'].file;
}
/**
* Extract the episode description text from the page
**/
var extractDescription = function(htmlString) {
	return $(htmlString).find('.playlistkey').parent().text();
}
