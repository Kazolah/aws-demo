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
    var axios = require('axios');

    var app = express();

    AWS.config.region = process.env.AWS_REGION || "ap-southeast-1"
    
    if (process.env.ENV !== "Production") {
        var credentials = new AWS.SharedIniFileCredentials({profile: 'p-2-admin'})
        AWS.config.credentials = credentials;
    }
    
    var ddb = new AWS.DynamoDB();
    var docClient = new AWS.DynamoDB.DocumentClient();

    var ddbTable =  process.env.DYNAMODB_TABLE || "messages"
    
    app.use(bodyParser.urlencoded({extended:false}));
    app.use(bodyParser.json())
    app.use(cors())

    app.get('/', function(req, res) {
        res.send({
            'status': 'OK'
        })
    });

    app.get('/messages', function(req, res) {
        var params = {
            TableName: ddbTable,
            ProjectionExpression: "created_at, message"
        }
        
        // Get all items to DynamoDB
        ddb.scan(params, function(err, data) {
            if (err) {
                res.status(500).send({
                    'status': 'Error',
                    'message': err
                })
                
            } else {
                res.send({
                    'status': 'OK',
                    'data': data.Items
                })
            }; 
        })
       
    });

    app.post('/messages', function(req, res) {
        if (!req.body.created_at && !req.body.message) {
            res.status(500).send({
                'status': 'Error',
                'message': 'Missing required parameters (created_at, message) in Body.'
            })
            return
        }
      
      var params = {
          TableName: ddbTable,
          Item: {
              "created_at": req.body.created_at,
              "message": req.body.message
          }
      }

      // Add new item to DynamoDB
      docClient.put(params, function(err, data) {
        if (err) {
            let errMsg = "Unable to add item. Error JSON:" + JSON.stringify(err, null, 2)
            console.error(errMsg);
            res.status(500).send({
                'status': 'Error',
                'message': errMsg
            })
        } else {
            let successMsg = "Successfully added item"
            res.send({
                'status': 'OK',
                'message': successMsg
            })
        }
      });
    });

    app.get('/svc-2', function(req, res) {
        var svc2URL = process.env.SVC2_URL || 'http://localhost:8081'
        const instance = axios.create({
            baseURL: svc2URL,
            timeout: 2000
        })
        instance.get('/hello')
        .then(response => {
            res.send({
                'status': 'OK',
                'message': response.data.message
            })
        })
        .catch(err => {
            res.status(500).send({
                'status': 'Error',
                'message': err
            })
        })
        
    })

    var port = process.env.PORT || 8080;

    var server = app.listen(port, function () {
        console.log('Server running at http://127.0.0.1:' + port + '/');
    });
}