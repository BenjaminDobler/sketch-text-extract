var JSZip = require("jszip");
var fs = require('fs');
var bplistParser = require('bplist-parser');

var textFields = [];

module.exports = function (path, cb) {
    console.log("PATH ", path);
    readFile(path)
        .then(readPages)
        .then(analyzePages)
        .then(function (data) {
            console.log("Data ", data);
            if (cb) {
                cb(null, textFields);
            }
        }, function (err) {
            console.log("Error ", err);
            if (cb) {
                cb(err, null);
            }
        });

};


function analyzePages(pages) {
    let analyzedData = pages.map(x => analyzePageLayers(JSON.parse(x), 0, null));
    console.log("TextFields ", textFields);
}

function analyzePageLayers(layer, level, parent) {
    //console.log("Analyze ", layer);
    if (layer._class === 'page') {
        console.log("Page ", layer.name);
    } else if (layer._class === 'text') {
        console.log('Text Found! ' + getPath(layer));
        let textObj = {};
        const archiveData = layer.attributedString.archivedAttributedString._archive;
        const buf = Buffer.from(archiveData, 'base64');

        bplistParser.parseFile(buf, function (err, obj) {
            if (err) throw err;
            //console.log("Obj ", obj);
            //const parser: = new NSArchiveParser();


            let decodedTextAttributes = parseNSArchive(obj);
            if (decodedTextAttributes.NSAttributes.MSAttributedStringFontAttribute) {
                let fontFamily = decodedTextAttributes.NSAttributes.MSAttributedStringFontAttribute.NSFontDescriptorAttributes.NSFontNameAttribute;
                let fontSize = decodedTextAttributes.NSAttributes.MSAttributedStringFontAttribute.NSFontDescriptorAttributes.NSFontSizeAttribute;
                textObj.fontFamily = fontFamily;
                textObj.fontSize = fontSize;
            }
            if (decodedTextAttributes.NSAttributes.NSParagraphStyle) {
                let paragraphSpacing = decodedTextAttributes.NSAttributes.NSParagraphStyle.NSParagraphSpacing;
                textObj.paragraphSpacing = paragraphSpacing;

            }
            let stringValue = decodedTextAttributes.NSString;

            textObj.value = stringValue;
            textObj.id = getPath(layer);
            let textOpacity = 1;
            let fontColor = '#000000';
            if (decodedTextAttributes.NSAttributes && decodedTextAttributes.NSAttributes.NSColor) {
                const colorArray = decodedTextAttributes.NSAttributes.NSColor.NSRGB.toString().split(' ');
                const colors = {};
                colors.red = parseFloat(colorArray[0]);
                colors.green = parseFloat(colorArray[1]);
                colors.blue = parseFloat(colorArray[2]);
                if (colorArray.length > 3) {
                    textOpacity = parseFloat(colorArray[3]);
                }
                fontColor = colorToHex(colors);
                textObj.color = fontColor;
            }
            textObj.frame = layer.frame;

            textFields.push(textObj);

            console.log("Decoded ", decodedTextAttributes);


        });
    }

    if (layer.layers) {
        const newLevel = level + 1;
        layer.layers.forEach((l) => {
            console.log("--- Layer");
            l.parent = layer;
            analyzePageLayers(l, newLevel, layer);
        });
    }
}

function getPath(layer) {
    let name = layer.name;
    while (layer.parent) {
        layer = layer.parent;
        name += name === '' ? layer.name : '.' + layer.name;


    }
    console.log("LAYER PATH ", layer.name);
    return name.split('.').reverse().join('.').toUpperCase().split(' ').join('_');
}

function colorToHex(color) {

    const componentToHex = (c) => {
        const hex = c.toString(16);
        return hex.length == 1 ? '0' + hex : hex;
    };


    const rgbToHex = (r, g, b) => {
        return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
    };


    const r = Math.round(color.red * 255);
    const g = Math.round(color.green * 255);
    const b = Math.round(color.blue * 255);
    return rgbToHex(r, g, b);

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