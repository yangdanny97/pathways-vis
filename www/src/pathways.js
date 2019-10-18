var $ = require('jquery');

import '../style/pathways.scss';

var urlParams = new URLSearchParams(window.location.search);
var major = urlParams.get('major');

$('#major')[0].innerHTML = major;
