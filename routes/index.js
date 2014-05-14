
/*
 * GET home page.
 */
var MONGO_URL = process.env.MONGOHQ_URL || 'mongodb://localhost:27017/pbscast'; // use local mongodb in dev
var TEMPLATE_PATH = './views/index.jade';
var Q = require('q');
var fs = require('fs');

exports.index = function(req, res){

	retrieveAllPodcasts().then(function(data){
		res.render('index', {
			pbsRoot: 'http://pbsfm.org.au',
			programData:data})
	});
};


// retrieve all podcast data from mongo db
var retrieveAllPodcasts = function() {
console.log('retrieveAllPodcasts');
	var deferred = Q.defer();
	var db = require('monk')(MONGO_URL);
	var query = {};
	
	db.get('programData').find(query).on('success', function(data) {
		console.log('success');
		db.close();
	    deferred.resolve(data);
	}).on('error', function(err) {
		console.error('error '+err);
		db.close();
	    deferred.resolve(null);
	});

    return deferred.promise;
}
