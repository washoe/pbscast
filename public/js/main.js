// main.js - client code
// (requires jQuery)


$(document).ready(function(){
	$('#programlist a.getpodcast').click(function(event){
		// request podcast xml doc from server using itpc protocol
		var protocol = 'itpc';
		//protocol = 'http';// for testing
		var getpodcastUrl = protocol + '://'+location.hostname+(location.port ? ':'+location.port : '')+'/getpodcast/'+$(event.target).data('programId');
		window.open(getpodcastUrl);
	})
});