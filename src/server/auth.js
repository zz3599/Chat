// User 
// GET - login
// POST - register
module.exports = function(app, ddl, commons){
    app.route('/user').get(function(req, res, next){
        var userName = req.param('userName');
        var password = req.param('password');
        console.log('trying to login ' + userName);
        //    deepDump(req);
        if(userName && password){
            ddl.getUser(userName, password, function(err, rows){
                if(!rows || rows.length === 0){
                    console.log('user does not exist');
                    res.send(404);
                } else {
                    console.log('logged in userid=' + rows[0].userId);
                    //persist userid in session
                    req.session.userId = rows[0].userId;
                    req.session.userName = userName;
                    res.send({userid: rows[0].userId});
                }
            });
        } else {
            res.send(404);
        }
    }).post(function(req, res, next){
        var userName = req.body.userName;
        var password = req.body.password;
        if(userName && password){
            ddl.createUser(userName, password, function(err){
                if(err){
                    console.log("Could not create user: " + err);
                    res.send(404);
                } else {
                    console.log('inserted user id=' + this.lastID);         
                    req.session.userId = this.lastID;   
                    res.send({userid: this.lastID});
                }
            })
        }
    });
}