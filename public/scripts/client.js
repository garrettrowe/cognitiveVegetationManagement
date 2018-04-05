var id = new Date().getTime();
var io = io();
var lat = -117.5859;
var long = 33.4552;
var clipSlider = undefined;
var tMax = 0;
var tMin = 1;
var tAvg = 0;



io.on('connect', function() {
    resetMetrics();
    console.log("socket connect")
    io.emit('upgrade', id);
});

io.on('disconnect', function() {
    console.log('socket disconnect');
});

io.on('update', function(data) {
    var feedback = $("#feedback");
    var innerHTML = feedback.html();
    innerHTML = data.toString() + "<br/>" + innerHTML;
    feedback.html(innerHTML);
});

io.on("processingComplete", function(data) {
    renderResult(data);
});
io.on("mapOk", function(data) {
    renderMap(data);
});

$(document).ready(function() {
    $("#sessionId").val(id);
    
    clipSlider = $("#clipSlider").bootstrapSlider();
    clipSlider.bootstrapSlider();
    clipSlider.on("change", function(event) {
        setClipLevel(event.value.newValue);
    });
   
    $("#overlayToggle").change(function(event) {
        var checked = $(this).prop('checked')
        $("#render table").css('visibility', checked ? 'visible' : 'hidden');
    });

    $('#bCent').click(function(e) {
        lat = -117.5859;
        long = 33.4552;
        resetMetrics();
    });
    $('#bLeft').click(function(e) {
        lat = lat - .0003
        resetMetrics();
    });
    $('#bRight').click(function(e) {
        lat = lat + .0003
        resetMetrics();
    });
    $('#bUp').click(function(e) {
        long = long + .0003
        resetMetrics();
    });
    $('#bDown').click(function(e) {
        long = long - .0003
        resetMetrics();
    });
    
 })

function resetMetrics(){
    tMax = 0;
    tMin = 1;
    tAvg = 0;
    $("#waitOverlay").show();
    $("#feedback").html("Querying Map Tiles");
    $("#overlayToggle").bootstrapToggle('off');
    $("#overlayToggle").bootstrapToggle('disable');
    $.get( "/render", { sessionId: id, lat: lat, long: long });

}
function setClipLevel(targetScale) {
    targetScale = targetScale || $('#clipSlider').bootstrapSlider('getValue');
    $( ".oCell" ).each(function( index ) {
        if(($( this ).text() -0) < targetScale)
            $( this ).toggleClass( "cellHidden", true );
        else
            $( this ).toggleClass( "cellHidden", false );
    });
}

function renderMap(dataStr) {
    var data = JSON.parse(dataStr)
    $("#myMap").attr("src",data.imagePath);
    $("#waitOverlay").hide();
}

function renderResult(dataStr) {
    var data = JSON.parse(dataStr)
    var renderContainer = $("#vegTable");
    $.get(data.jsonPath, function(result) {
            var table = constructTable(result);
            renderContainer.html(table);
            $("#tileMin").text(tMin);
            $("#tileMax").text(tMax);
            $("#tileAvg").text((tAvg/36).toFixed(3));
            $("#overlayToggle").bootstrapToggle('enable');
            $("#overlayToggle").bootstrapToggle('on');
            setClipLevel();
        });
}

function constructTable(data) {
    var table = $("<table>");

    var rows = data.tiles
    for (var r = 0; r < rows.length; r++) {
        var cols = data.tiles[r]
        var row = $("<tr>");

        for (var c = 0; c < cols.length; c++) {
            var cell = $("<td>");
            var cellData = cols[c];
            cell.addClass("oCell");
            var style = getAnalysis(cellData);
            cell.css("background", style)
            cell.html(getConfidence(cellData));
            row.append(cell);
        }

        table.append(row);
    }

    return table;
}

function getAnalysis(cellData) {
    if (cellData.analysis && cellData.analysis.images && cellData.analysis.images.length > 0) {
        var image = cellData.analysis.images[0];
        if (image && image.classifiers && image.classifiers.length > 0) {
            var classifier = cellData.analysis.images[0].classifiers[0]

            if (classifier && classifier.classes && classifier.classes.length > 0) {
                var classification = classifier.classes[0];
                return "rgba(255,0,0," + classification.score/2 + ")"
            }
        }
    }
    return "rgba(0,0,0,0)"
}

function getConfidence(cellData) {
    if (cellData.analysis && cellData.analysis.images && cellData.analysis.images.length > 0) {
        var image = cellData.analysis.images[0];
        if (image && image.classifiers && image.classifiers.length > 0) {
            var classifier = cellData.analysis.images[0].classifiers[0]
            if (classifier && classifier.classes && classifier.classes.length > 0) {

                var classification = classifier.classes[0];
                var tscore = classification.score.toFixed(3)-0;
                if (tscore < tMin)
                    tMin = tscore;
                if (tscore > tMax)
                    tMax = tscore;
                tAvg = tAvg + tscore;
                return classification.score.toFixed(3);
            }
        }
    }
    return ""
}
