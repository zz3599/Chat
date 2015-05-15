//clear users from activeusermap that have not been active for a while
module.exports = function(commons){
    (function clearInactiveUsers(){
        setTimeout(function(){
            var minThresholdTime = new Date().getTime() - commons.ACTIVE_MILLIS; 
            for(var elem in commons.activeUserMap){
                if(commons.activeUserMap.hasOwnProperty(elem)){
                    if(commons.activeUserMap[elem]['lastActive'] < minThresholdTime){
                        console.log('removed inactive user: ' + elem);
                        commons.removeActiveUser(elem);
                    }
                }
            }
            clearInactiveUsers();
        }, 1000);
    })();
}