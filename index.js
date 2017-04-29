var JSZip = require("jszip");
var fs = require('fs');

module.exports = function (path) {
    console.log("PATH ", path);
    readFile(path)
        .then(readPages)
        .then(analyzePages)
        .then(function (data) {
            console.log("Data ", data);
        }, function (err) {
            console.log("Error ", err);
        });

};


function analyzePages(pages) {
    let analyzedData = pages.map(x=>analyzePageLayers(JSON.parse(x), 0, null));
}

function analyzePageLayers(layer, level, parent) {
    //console.log("Analyze ", layer);
    if (layer._class === 'page') {

    } else if(layer._class === 'text') {
        console.log('Text Found! ');
    }

    if (layer.layers) {
        const newLevel = level + 1;
        layer.layers.forEach((l)=>{
            console.log("--- Layer");
            analyzePageLayers(l, newLevel, layer);
        });
    }
}


function readPages(zip) {
    console.log(Object.keys(zip.files));
    const pages = Object.keys(zip.files).filter(x => x.startsWith('pages'));
    let pagePromises = pages.map(x => zip.file(x).async('string'));
    console.log("Pages ", pages);
    return Promise.all(pagePromises);
}


function readFile(path) {
    return new JSZip.external.Promise(function (resolve, reject) {
        fs.readFile(path, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    }).then(function (data) {
        return JSZip.loadAsync(data);
    })
}