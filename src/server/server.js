var express = require('express');
var path = require('path');
var bodyparser = require('body-parser');
var ddl = require('./db/ddl');
var cookieSession = require('express-session');
var app = express();

app.use('/public', express.static(__dirname + '/public'));
app.use( bodyparser.json()); // to support JSON-encoded bodies for posts, gets should not be stringifiied
app.use(cookieSession({
    resave: false,
    saveUninitialized: false,
    secret: 'NOTSECRET'
}));
app.locals.pretty = true;

//Load common functions
var commons = require('./commons.js');
// Home /login page
app.route('/home').get(function(req, res, next){
    res.render(path.resolve('public/home.jade'), {});
});


require('./auth.js')(app, ddl, commons);
require('./chathome.js')(app, ddl, commons);
require('./message.js')(app, ddl, commons);
require('./poll.js')(app, ddl, commons);


require('./cron/updateQueuedUsers.js')(commons);
require('./cron/clearInactiveUsers.js')(commons);


app.listen(3000);