// Include the cluster module
var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for terminating workers
    cluster.on('exit', function (worker) {

        // Replace the terminated workers
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();

    });

// Code to run if we're in a worker process
} else {
    var AWS = require('aws-sdk');
    var express = require('express');
    var bodyParser = require('body-parser');
    var cors = require('cors');
    var moment = require('moment-timezone')
    var app = express();
    AWS.config.region = process.env.AWS_REGION || "ap-southeast-1"

    app.use(bodyParser.urlencoded({extended:false}));
    app.use(bodyParser.json())
    app.use(cors())

    app.get('/hello', function(req, res) {
        res.send({
            'status': 'OK',
            'message': 'Replied from Svc2 at ' + moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:SS')
        })
    });

    var port = process.env.PORT || 8081;

    var server = app.listen(port, function () {
        console.log('Server running at http://127.0.0.1:' + port + '/');
    });
}