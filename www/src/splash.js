var $ = require('jquery')

import '../style/splash.scss';

let input = $("#majorin")[0];
let major = input.value;

function update() {
    $('#golink')[0].href = 'pathways.html?major=' + input.value;
}

update();

input.oninput = update;
window.update = update;
