
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , getpodcast = require('./routes/getpodcast')
  , http = require('http')
  , path = require('path')
  , CronJob = require('cron').CronJob;

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/getpodcast/:id', getpodcast.get);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));

  // build podcasts once a week, midnight every Monday
  new CronJob('0 0 0 * * 0', function(){
      getpodcast.buildAll(); 
  }, null, true);
  getpodcast.buildAll(); 
});
