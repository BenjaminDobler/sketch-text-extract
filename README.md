# sketch-text-extract
extract text information from sketch 43+ files

# Usage
var extract = require('sketch-text-extract');

extract('pathToSketchFile', (err, result)=>{
    if (err) {
        console.log("Error ", err);
    } else {
        console.log("Result ", result);
    }
});

