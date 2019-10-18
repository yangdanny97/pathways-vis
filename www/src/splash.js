var $ = require('jquery')

import '../style/splash.scss';

var input = $(".form-control")[0];
let major = input.value;

function go() {
    major = $('input')[0].value
    window.location = 'pathways.html?major=' + major;
}

window.go = go;
