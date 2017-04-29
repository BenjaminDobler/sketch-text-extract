var JSZip = require("jszip");
var fs = require('fs');
var bplistParser = require('bplist-parser');

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
    let analyzedData = pages.map(x => analyzePageLayers(JSON.parse(x), 0, null));
}

function analyzePageLayers(layer, level, parent) {
    //console.log("Analyze ", layer);
    if (layer._class === 'page') {

    } else if (layer._class === 'text') {
        console.log('Text Found! ');
        const archiveData = layer.attributedString.archivedAttributedString._archive;
        const buf = Buffer.from(archiveData, 'base64');

        bplistParser.parseFile(buf, function (err, obj) {
            if (err) throw err;
            //console.log("Obj ", obj);
            //const parser: = new NSArchiveParser();
            let decodedTextAttributes = parseNSArchive(obj);
            console.log("Decoded ", decodedTextAttributes);
        });
    }

    if (layer.layers) {
        const newLevel = level + 1;
        layer.layers.forEach((l) => {
            console.log("--- Layer");
            analyzePageLayers(l, newLevel, layer);
        });
    }
}


function parseNSArchive(archive) {

    let result = {};

    let objects = archive[0].$objects;
    let root = archive[0].$top.root.UID;

    let getReferenceById = (id) => {
        let r = {};
        let o = objects[id];
        if (typeof o === "string" || typeof o === "number" || typeof o === "boolean") {
            return o;
        }


        if (typeof o === "object") {
            for (var i in o) {
                if (o[i].UID) {
                    r[i] = getReferenceById(o[i].UID);
                } else if (Array.isArray(o[i]) && i !== "NS.keys" && i !== "NS.objects") {
                    r[i] = [];
                    o[i].forEach((ao) => {
                        if (ao.UID) {
                            r[i].push(getReferenceById(ao.UID));
                        } else {
                            r[i].push(ao);
                        }
                    });
                } else if (i !== "NS.keys" && i !== "NS.objects") {
                    r[i] = o[i];
                }

            }
        }

        if (o['NS.keys']) {
            o['NS.keys'].forEach((keyObj, index) => {
                let key = getReferenceById(keyObj.UID);
                let obj = getReferenceById(o['NS.objects'][index].UID);
                r[key] = obj;
            });
        }
        return r;
    };

    let topObj = objects[root];
    for (var key in topObj) {
        if (topObj[key].UID) {
            result[key] = getReferenceById(topObj[key].UID);
        }
    }
    return result;


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