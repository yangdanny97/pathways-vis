var $ = require('jquery')

input = $("#majorin")[0];
major = input.value;

function update() {
    $('#golink')[0].href = 'pathways.html?major=' + input.value;
}

update();

input.oninput = update;
window.update = update;
