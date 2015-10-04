var express = require('express');
var app = express();
var redis = require('redis');
var SubstringSearchEngine = require('./SubstringSearchEngine');

app.set('port', (process.env.PORT || 5000));

function createRedisClient() {
    var client = redis.createClient(14769,'MY URL',{});
    client.auth('MY AUTH');
    return client;
}

var TASK_LIST_REDIS_KEY = "taskList";
var DONE_LIST_REDIS_KEY = "doneList";

var redisClient = createRedisClient();
var searchEngine = new SubstringSearchEngine.SubstringSearchEngine(redisClient);


//todo: 2 letter tasks
//todo: error handling
//todo: return web view, rather than json?
//dupe tasks
//search done maybe?



function sendTaskList(response) {
    var tasks = [];
    var doneTasks = [];
    redisClient.lrange(TASK_LIST_REDIS_KEY, 0, 100, function(error, items) {
        if (error) throw error;
        items.forEach(function(item) {
            tasks.push(item);
        });

        redisClient.lrange(DONE_LIST_REDIS_KEY, 0, 100, function(error, items) {
            if (error) throw error;
            items.forEach(function(item) {
                doneTasks.push(item);
            });
            response.json({"current": tasks, "complete": doneTasks});
        })
    });

    return tasks;
}

function loadScripts() {
    searchEngine.loadScripts(redisClient);
}

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
  loadScripts();
});





app.get('/insert', function(request, response) {
    var taskName = request.query.task;
    redisClient.rpush(TASK_LIST_REDIS_KEY,taskName, function(error, listLength) {
        if (error) throw error;
        searchEngine.insert(taskName, function() {
            sendTaskList(response);
        });
    });
});

app.get('/complete', function(request, response) {
    var taskToComplete = request.query.doneTask
    redisClient.lrem(TASK_LIST_REDIS_KEY, 0, taskToComplete, function(error, numRemoved) {
        if (error) throw error;
        if (numRemoved > 0) {
            searchEngine.remove(taskToComplete, function() {
                redisClient.rpush(DONE_LIST_REDIS_KEY, taskToComplete, function(error, listLength) {
                    sendTaskList(response);
                });
            });
        } else {
            console.log("TASK [" + taskToComplete + "] NOT FOUND TO BE COMPLETED");
            sendTaskList(response);
        }
    });
})

app.get('/clearComplete', function(request, response) {
    redisClient.del(DONE_LIST_REDIS_KEY, function(error, numRemoved) {
        if (error) throw error;
        sendTaskList(response);
    })
});

app.get('/list', function(request, response) {
    sendTaskList(response);
})





app.get('/search', function(request, response) {
    searchEngine.search(request.query.searchTerm);
    sendTaskList(response);
    //tood: don't send task list, send something useful instead
});


