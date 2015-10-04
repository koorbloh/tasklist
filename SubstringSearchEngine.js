
/*
 * SubstringSearchEngine: things that are inserted into the search engine can be searched for
 * This uses partial substring matching, case-insensitive
 */


/*
 * Task list:
 * handle 2 letter entries
 * smembers will blow up "at scale"
 * full string to id for completelness, but satisfies needs for now
 * done callback for search
 * error handling
 */


var fs = require('fs');


function log(stringToLog) {
    console.log("[SubstringSearchEngine]: " + stringToLog);
}

var substringKeyPrefix = "SubstringSearchEngine:Substring:";
var fullStringKeyPrefix = "SubstringSearchEngine:FullString:";
var SEARCH_LUA_SCRIPT_SHA_KEY = "searchScriptSha";


function SubstringSearchEngine(redisClient) {
    this.redisClient = redisClient;
    log("Constructor");
};

SubstringSearchEngine.prototype.insert = function(searchTerm, doneCallback) {
    //put it in the search engine
    log("Insert: " + searchTerm);
    var termLength = searchTerm.length;
    //this part needs to have some sort of ID with it or something
    var redisClient = this.redisClient;
    redisClient.sadd(fullStringKeyPrefix + searchTerm, searchTerm, function(error, result) {
        if (error) throw error;
        if (termLength < 3) {
            log("length is too short to split: " + String(termLength));
            //todo: 2 letter tasks?  throw error maybe?
        } else {
            log("length is " + String(termLength));
            for (i = 0; i < termLength - 2; ++i) {
                var substr = searchTerm.substring(i, i + 3);
                log("inserting into substrings: " + substr);
                redisClient.sadd(substringKeyPrefix + substr, searchTerm, function(error, result) {
                    if (error) throw error;
                });
            }
        }
        doneCallback();
    });
};

SubstringSearchEngine.prototype.remove = function(searchTerm, doneCallback) {
    log("Remove: " + searchTerm);
    var termLength = searchTerm.length;
    var redisClient = this.redisClient;
    redisClient.srem(fullStringKeyPrefix + searchTerm, searchTerm, function(error, result) {
        if (error) throw error;
        if (termLength < 3) {
            log("length is too short to split: " + String(termLength));
            //todo: 2 letter tasks?  throw error maybe?
        } else {
            log("length is " + String(termLength));
            for (i = 0; i < termLength - 2; ++i) {
                var substr = searchTerm.substring(i, i + 3);
                log("removing from substrings: " + substr);
                redisClient.srem(substringKeyPrefix + substr, searchTerm, function(error, result) {
                    if (error) throw error;
                });
            }
        }
        doneCallback();
    });
};





//intersect shamelessly stolen from: 
//http://stackoverflow.com/questions/16227197/compute-intersection-of-two-arrays-in-javascript
function intersect(a, b) {
    var t;
    if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
    return a.filter(function (e) {
        if (b.indexOf(e) !== -1) return true;
    });
}


function analyzeSubstringValues(pulledValues) {
    log("FOUND: " + JSON.stringify(pulledValues));
    var workingSet = null;
    for (var i = 0; i < pulledValues.length; ++i) {
        var aSet = pulledValues[i];
        log("set: " + JSON.stringify(aSet));
        if (workingSet == null) {
            log("first");
            workingSet = aSet;
        } else {
            log("trying " + JSON.stringify(aSet) + " and " + JSON.stringify(workingSet));
            workingSet = intersect(aSet, workingSet);
        }
        log("new working set: " + JSON.stringify(workingSet));
    }
    log("DONE: FOUND: " + JSON.stringify(workingSet));
}




function getSubstringValues(redisClient, allSubstrings, currentIndex, pulledValues) {
    //AT SCALE: smembers will blow up.  use a scan instead.
    redisClient.smembers(substringKeyPrefix + allSubstrings[currentIndex], function(error, result) {
        if (error) throw error;
        pulledValues.push(result);
        if (currentIndex + 1 == allSubstrings.length) {
            analyzeSubstringValues(pulledValues);
        } else {
            getSubstringValues(redisClient, allSubstrings, currentIndex + 1, pulledValues);
        }
    });
}

SubstringSearchEngine.prototype.search = function(searchTerm) {
    log("search: " + searchTerm);
    var redisClient = this.redisClient;

    var termLength = searchTerm.length;
    var searchKeys = new Array();
    if (termLength < 3) {
        searchKeys.push(searchTerm);
    } else {
        for (i = 0; i < termLength - 2; ++i) {
            searchKeys.push(searchTerm.substring(i, i + 3));
        }        
    }
    log("all keys " + JSON.stringify(searchKeys));
    getSubstringValues(redisClient, searchKeys, 0, new Array());
};















//this was a good thought, but the script needs to know the keys when we call it
//so Reds can smartly cache them.  Instead, we're going to play the callback game.
//As this works, I'm going to leave it as example code to myself if/when I ever want it.
SubstringSearchEngine.prototype.loadScripts = function() {
    var redisClient = this.redisClient;
    var file = fs.readFileSync("searchScript.lua", "utf8");
    console.log(file);
    redisClient.send_command('script', ['load', file], function(error, sha) {
        if(error) {
            throw error;
        } else {
            console.log("SCRIPT LOADED");
            this.searchScriptSha = sha;
        }
    });
}

module.exports.SubstringSearchEngine = SubstringSearchEngine;

