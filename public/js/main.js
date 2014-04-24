// main.js - client code
// (requires jQuery)


$(document).ready(function(){
	getProgramList(function(data){renderPrograms(data)})
});

var getProgramList = function(callBack) {
	var spinner = new Spinner({
		length:0,
		width:16,
		radius:30,
		speed:0.5
	}).spin();
	var $target = $('#programlist').append(spinner.el).addClass('loading');
	var pbsRoot = 'http://pbsfm.org.au';
	var programListUrl = pbsRoot+'/programlist';
	$.when(getXdomainUrl(programListUrl)).then (function(data) {
		spinner.stop();
		$target.removeClass('loading');
		var programList = parseProgramListHtml(data.contents);
		callBack(programList);
	})
}


// extract program data from programlist page
var parseProgramListHtml = function(htmlString) {
	var $html = $(htmlString);
	var selector = '.view-programs-active-list td';
	var descriptionSelector = 'div.views-field-field-presenter-value span';
	var $programList = $html.find(selector);
	var result = [];
	$programList.each(function() {
		var programData = {};
		programData.href = $(this).find('a').attr('href');
		programData.name = $(this).find('a').html();
		programData.description = $(this).find(descriptionSelector).html();
		// only include if there is an href
		if (undefined != programData.href) {
			result.push(programData);
		}
		
		
	});
	return result;
}

// render programs as list
var renderPrograms = function(programList) {
	var pbsRoot = 'http://pbsfm.org.au';
	var $target = $('#programlist');
	var $ul = $('<ul>');
	programList.forEach(function(programData){
		// create li with metadata and link to create podcast
		var $li = $('<li>').attr('class', 'program').appendTo($ul);
		var $titleAndLink = $('<a>').html(programData.name).attr('href', pbsRoot + programData.href).appendTo($li);
		var $description = $('<div>').html(programData.description).appendTo($li);
		var $generatePodcastButton = $('<button class="btn btn-default">').html('generate podcast').click(function() {
			generatePodCast (programData);
		}).appendTo($li);
	})
	$target.html($ul);
}

var generatePodCast = function(programData) {
	// request podcast xml doc from server using itpc protocol
	var getpodcastUrl = 'itpc://'+location.hostname+":"+location.port+'/getpodcast'+programData.href;
	window.open(getpodcastUrl);
}

/**
* use whateverorigin to circumvent xdomain restrictions
**/
var getXdomainUrl = function(url, callBack){
		// whateverorigin circumvents xdomain restrictions
	return $.getJSON('http://whateverorigin.org/get?url=' + encodeURIComponent(url) + '&callback=?');
}