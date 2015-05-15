//Url: Chat - chat page
//Methods: GET/POST
var path = require('path');

module.exports = function(app, ddl, commons){
    app.route('/chat').get(function(req, res, next){
        var userId = req.param('id');//req.session.userId;
        if(!userId){
            res.render(path.resolve('public/home.jade'), {});
        } else {
            console.log("userid=" + userId);
            ddl.getUsergroups(req.session.userId, function(err, rows){
                console.log(rows);
                // groupid -> [usernames not of this user - for displaying purposes]
                var groupUsernames = {};
                var prevGroupId = -1;
                // User is active
                commons.setActiveUser(userId);
                for(var i = 0; i < rows.length; i++){
                    //Avoid adding the current user's name into the group name list 
                    if(userId != rows[i].userId){                    
                        if(rows[i].groupId in groupUsernames){
                            groupUsernames[rows[i].groupId].push(rows[i].userName);
                        } else {
                            groupUsernames[rows[i].groupId] = [rows[i].userName];
                        }                    
                    }
                    if(rows[i].groupId != prevGroupId){
                        commons.putUserIntoGroup(userId, rows[i].groupId);
                        prevGroupId = rows[i].groupId;
                    }                
                }
                console.log(groupUsernames);
                console.log(commons.groupUserMap); //global var populated/            
                res.render(path.resolve('public/index.jade'), {'existingMessages':[], 'groups': groupUsernames});              

            });
        }    
    });
}