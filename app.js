/*eslint-env node*/
var express = require('express');
var fs = require('fs');
var http = require("http");
var https = require("https");
var uuid = require('node-uuid');
var gm = require('gm').subClass({
    imageMagick: true
});
var request = require('request');
var async = require("async");
var spawn = require('child_process').spawn;

var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');

var totalAnalysisRequests = 0;
var completeAnalysisRequests = 0;

var rootDir = './maps';
var MIN_TILE_SIZE = 200;

// PUT YOUR KEYS HERE:
var WATSON_KEY = "";
var WATSON_CLASSIFIER = "";
var MAPBOX_KEY = "";

var visual_recognition = new VisualRecognitionV3({
    api_key: WATSON_KEY,
    version_date: '2016-05-19'
});

var cfenv = require('cfenv');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));
app.use('/maps', express.static(rootDir));

var appEnv = cfenv.getAppEnv();

app.get('/render', function(req, res) {
    var sampleFile;
    var id = uuid.v4();
    var sessionId = req.query.sessionId;
    completeAnalysisRequests = 0;

    var uploadDir = rootDir + "/" + id;
    var imagePath = uploadDir + "/image.jpg";
    var jsonPath = uploadDir + "/image.json";

    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir);
    }

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }

    tileWidth = MIN_TILE_SIZE
    tileHeight = MIN_TILE_SIZE

    var url = "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/" + req.query.lat + "," + req.query.long + ",20/1200x1200?access_token=" + MAPBOX_KEY;

    var file = fs.createWriteStream(imagePath);
    https.get(url).on('response', function (response) {
        response.pipe(file);
        response.on('end', function () {
                res.send('ok');
                var result = {imagePath: imagePath};
                dispatch(sessionId, "mapOk", JSON.stringify(result))
                generateImageTiles(sessionId, {
                    rootDir: rootDir,
                    id: id,
                    imagePath: imagePath,
                    imageDir: uploadDir,
                    tileWidth: tileWidth,
                    tileHeight: tileHeight
                }, function(err, imageData) {
                    if (err) {
                        update(sessionId, "parsing error: " + err.toString())
                    } else {
                        update(sessionId, "parsing complete")
                        var imageData = imageData;
                        imageData.imagePath = imagePath;
                        processImages(sessionId, imageData, function(updatedImageData) {
                            update(sessionId, "Analysis complete!")
                            var json = JSON.stringify(updatedImageData);
                            fs.writeFile(jsonPath, json, function(err) {
                                if (err) return update(sessionId, err);
                                result = {jsonPath: jsonPath};
                                dispatch(sessionId, "processingComplete", JSON.stringify(result))
                            });

                        })
                    }
                });
        });
    });
    setTimeout(deleteFolder.bind(null, uploadDir), 10000);
});

var deleteFolder = function(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index){
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolder(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function generateImageTiles(sessionId, options, callback) {
    var imageSize = {};
    var parseData = {};
    var tilesDir = options.imagePath + "_tiles";
    var tileWidth = options.tileWidth;
    var tileHeight = options.tileHeight;

    if (!fs.existsSync(tilesDir)) {
        fs.mkdirSync(tilesDir);
    }

    var image = gm(options.imagePath)
        .size(function(err, size) {

            if (err) {
                callback(err);
                return;
            }

            imageSize = size;

            var cols = Math.ceil(imageSize.width / tileWidth);
            var rows = Math.ceil(imageSize.height / tileHeight);

            parseData.imageWidth = size.width;
            parseData.imageHeight = size.height;
            parseData.dimensions = {
                cols: cols,
                rows: rows
            }

            parseData.tiles = [];

            var command = 'convert ' + options.imagePath + ' -crop ' + tileWidth + 'x' + tileHeight + ' -set filename:tile "%[fx:page.x]_%[fx:page.y]" +repage +adjoin "' + tilesDir + '/tile_%[filename:tile].jpg"';
            
            var childProcess = spawn("convert", [
                options.imagePath,
                "-crop", tileWidth + 'x' + tileHeight,
                "-set", "filename:tile", "%[fx:page.x]_%[fx:page.y]",
                "+repage",
                "+adjoin", tilesDir + "/tile_%[filename:tile].jpg"
            ]);

            var childProcessError = undefined;

            childProcess.on('error', function(err) {
                childProcessError = err;
            });

            childProcess.on('close', function(code) {
                
                if (code == 0) {
                    for (var r = 0; r < rows; r++) {

                        if (parseData.tiles[r] == undefined) {
                            parseData.tiles[r] = [];
                        }

                        for (var c = 0; c < cols; c++) {

                            if (parseData.tiles[r][c] == undefined) {
                                parseData.tiles[r][c] = {};
                            }

                            var x = c * tileWidth;
                            var y = r * tileHeight;
                            var output = tilesDir + "/tile_" + x + "_" + y + ".jpg";

                            parseData.tiles[r][c].path = output;
                            parseData.tiles[r][c].size = {
                                width: Math.min(tileWidth, parseData.imageWidth - x),
                                height: Math.min(tileHeight, parseData.imageHeight - y)
                            }
                        }
                    }
                }
                callback(childProcessError, parseData);
            });
        });
}

function processImages(sessionId, imageData, callback) {
    update(sessionId, "performing analysis on tiles...")
    totalAnalysisRequests = 0;
    completeAnalysisRequests = 0;
    var requests = [];
    for (var r = 0; r < imageData.tiles.length; r++) {
        for (var c = 0; c < imageData.tiles[r].length; c++) {
            var image = imageData.tiles[r][c];
            requests.push(analyzeImage(sessionId, image, c));
        }
    }

    async.parallelLimit(requests, 16, function() {
        totalAnalysisRequests++;
        callback(imageData);
    })

}


function analyzeImage(sessionId, _image, num) {
    totalAnalysisRequests++;
    return function(analyze_callback) {
        var fileName = _image.path;
        var analysis = {}

        update(sessionId, "Analyzing tile: " + num);
        var params = {
            images_file: fs.createReadStream(fileName),
            classifier_ids: [WATSON_CLASSIFIER],
            threshold: 0.0
        };

        visual_recognition.classify(params, function(err, res) {
            completeAnalysisRequests++;
            if (err) {
                analysis = {
                    error: err
                }
            } else {
                update(sessionId, "Tile: " + completeAnalysisRequests + " of " + totalAnalysisRequests + " complete")
                analysis = res;
            }
            _image.analysis = analysis;
            analyze_callback();
        });
    }
}

io.on('connection', function(socket) {
    appSocket = socket
    console.log('a user connected');

    socket.on('disconnect', function() {
        console.log('user disconnected');
    });

    socket.on('upgrade', function(room) {
        console.log('Session id: ' + room);
        socket.join(room);
        socketMap[room] = socket;
    });
});


var socketMap = {};

function update(id, data) {
    if (id && socketMap[id]) {
        socketMap[id].emit("update", data)
    }
}

function dispatch(id, event, data) {
    if (id && socketMap[id]) {
        socketMap[id].emit(event, data)
    }
}


http.listen(appEnv.port, function() {
    console.log("Magic happening on " + appEnv.url);
});

require("cf-deployment-tracker-client").track();
