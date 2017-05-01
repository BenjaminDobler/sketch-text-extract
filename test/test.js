

var extract = require('../index');

extract('/Users/benjamindobler/Documents/repos/sketch-text-extract/test/Fitness App.sketch', (err, result)=>{
    if (err) {
        console.log("Error ", err);
    } else {
        console.log("Result ", result);
    }

});
