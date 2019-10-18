var $ = require('jquery');
var request = require('request');

import '../style/pathways.scss';

// Get major from url query string
let urlParams = new URLSearchParams(window.location.search);
const major = urlParams.get('major');

// Put major in title bar
$('#major')[0].innerHTML = major;

// Load classes

let truncate = function(text, limit) {
    if (text.length > limit){
        for (let i = limit; i > 0; i--){
            if(text.charAt(i) === ' ' && (text.charAt(i-1) != ','||text.charAt(i-1) != '.'||text.charAt(i-1) != ';')) {
                return text.substring(0, i) + '...';
            }
        }
        return text.substring(0, limit) + '...';
    }
    else
        return text;
};

function info(course, callback) {
    let semester = "FA19";
    let dept = course.slice(0,-4);
    let num  = course.slice(-4);

    let url = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&subject=${dept}`

    request(url, function(error, response, body) {
        window.body = body;
        let data = JSON.parse(body).data;

        for (let course of data.classes) {
            if (course.catalogNbr == num) { 
                let trim = {
                    subject: course.subject,
                    catalogNbr: course.catalogNbr,
                    titleLong: course.titleLong,
                    titleShort: course.titleShort,
                    description: course.description,
                    credits: course.enrollGroups[0].unitsMinimum,
                    link: `https://classes.cornell.edu/browse/roster/FA19/class/${course.subject}/${course.catalogNbr}`
                }
                    
                callback(trim);
            }
        }
    });
}

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
    </div>`

    window.html = html;
    return html
}

function push(card) {
    $('#deck').append(card);
    for (let el of $(".card-text")) { $clamp(el, {clamp:3}); }
}

var stack = ["CS1110"];

info(stack[0], function(course) { push(card(course)); });

var send = (course) => info(course, function(course) { push(card(course)); });

window.send = send;
