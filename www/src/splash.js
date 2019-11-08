var d3 = require("d3-selection");
var Typeahead = require("typeahead")

import '../style/splash.scss';
import '../node_modules/typeahead/style.css';

var major_input = d3.select("#major").node();

var req = new Request("/majors/", { method: 'POST', });
var majors = fetch(req)
    .then(resp => resp.json())
    .then(function(json) {
        var names = json.map(obj => obj.Major);
        console.log(names);

        var ta = Typeahead(major_input, { source: names });
        return majors
    });



