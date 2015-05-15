//Url: Poll
//Listens to the message eventemitter and does no DB reads
module.exports = function(app, ddl, commons){
	app.route('/poll').get(function(req, res, next){
	    console.log('polling for new messages for user id=' + req.session.userId);
	    var userid=req.session.userId;
	    commons.setActiveUser(userid);
	    var userEmitter = commons.getUserEmitter(userid);
	    userEmitter.once(commons.EMIT_MESSAGE_EVENT, function(data){
	        console.log('received newMesage: ' + data);
	        res.send({'messages': data});
	    });    
	});
}