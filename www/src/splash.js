var d3 = require("d3-selection");

import '../style/splash.scss';

var input = d3.select(".form-control").node();
let major = input.value;

function go() {
    major = input.value
    window.location = 'vis/?major=' + major;
}

window.go = go;
