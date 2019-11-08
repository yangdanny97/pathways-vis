var d3 = require("d3-selection");
var typeahead = require("typeahead.js");
var $ = require("jquery");

import '../style/splash.scss';

var major_input = d3.select("#major").node();

var substringMatcher = function(strs) {
    return function findMatches(q, cb) {
        var matches, substrRegex;
    
        // an array that will be populated with substring matches
        matches = [];
    
        // regex used to determine if a string contains the substring `q`
        substrRegex = new RegExp(q, 'i');
    
        // iterate through the pool of strings and for any string that
        // contains the substring `q`, add it to the `matches` array
        $.each(strs, function(i, str) {
            if (substrRegex.test(str)) {
            matches.push(str);
            }
        });
    
        cb(matches);
    };
};

var req = new Request("/majors/", { method: 'POST', });
var names;
var majors = fetch(req)
    .then(resp => resp.json())
    .then(function(json) {
        names = json.map(obj => `${obj.Major} (${obj.Code})`);

        $("input").typeahead({
            minLength: 1,
            highlight: true
        },
        {
            name: "dataset",
            source: substringMatcher(names)
        });
        return json;
    });

function validate() {
    let re = /^.* \(([A-Z]*)\)$/;
    let text = major_input.value;
    let matches = text.match(re);
    if (matches == null) return false;
    if (matches.length == 2) {
        window.location = "vis/?major=" + matches[1];
    }
    return false;
}

$("form").attr("onsubmit", "validate()");

window.validate = validate;


