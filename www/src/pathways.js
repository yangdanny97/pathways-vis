var $ = require('jquery');
var request = require('request');

import '../style/pathways.scss';

// Get major from url query string
let urlParams = new URLSearchParams(window.location.search);
const major = urlParams.get('major');

// Put major in title bar
$('#major')[0].innerHTML = major;

// Load classes
var stack = []

/* Package the API course data into a smaller, neater object */
function grok(course) {
    let trim = {
        subject: course.subject,
        catalogNbr: course.catalogNbr,
        titleLong: course.titleLong,
        titleShort: course.titleShort,
        description: course.description,
        credits: course.enrollGroups[0].unitsMinimum,
        link: `https://classes.cornell.edu/browse/roster/FA19/class/${course.subject}/${course.catalogNbr}`
    }

    return trim;
}

/* Get grokked course for a particular code */
function info(code, callback) {
    let semester = "FA19";
    let dept = code.slice(0,-4);
    let num  = code.slice(-4);

    let url = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&subject=${dept}`

    request(url, function(error, response, body) {
        window.body = body;
        let data = JSON.parse(body).data;

        for (let course of data.classes) {
            if (course.catalogNbr == num) { 
                callback(grok(course));
            }
        }
    });
}

/* Get an array of grokked courses matching a particular search query */
function search(query, callback) {
    let fn = function(courses) {
        stack = courses
        window.stack = stack; 
        render()
        return 0;
    }
    callback = callback || fn;

    let semester = "FA19";
    let url = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&q=${query}&subject=${major}`;

    request(url, function(error, response, body) {
        window.body = body;
        let data = JSON.parse(body).data;

        let courses = data.classes.map(grok);

        callback(courses);
    });
}

/* Get an html card for a grokked course */
function card(course) {

    let html = `<div class='card'>
        <div class='card-header'>
            <div class='code'>${course.subject} ${course.catalogNbr}</div>
            <div class='name'>${course.titleShort}</div>
            <div class='cred'>${course.credits}</div>
        </div>
        <div class="card-body">
            <p class="card-text">${course.description}</p>
            <a class="btn btn-primary btn-sm" href="${course.link}" role="button" target="_blank">Details</a>
            <button class="btn btn-success btn-sm">Add</button>
        </div>
    </div>`;

    return html
}

/* Render an array of cards into the deck. If no array is provided, render the stack*/
function render(cards) {
    cards = cards || stack.map(card);

    $('#deck').empty()
    for (let card of cards) {
        $('#deck').append(card);
        console.log(card)
    }
    for (let el of $(".card-text")) { $clamp(el, {clamp:3}); }

    return 0;
}

window.search = search;
window.render = render;
window.stack = stack;
