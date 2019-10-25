import 'bootstrap';

import '../style/pathways.scss';

// Get major from url query string
let urlParams = new URLSearchParams(window.location.search);
const major = urlParams.get('major');

// Put major in title bar
$('#major')[0].innerHTML = major;

// Load classes
var stack = [];

var popular = []
var recs = [];
var search_results = [];

var pref = new Set()

/* Add a class to the list of preferred classes */
function add(code) {
    pref.add(code);
    window.pref = pref;
}

/* Remove a class from the list of preferred classes */
function remove(code) {
    pref.delete(code);
    window.pref = pref;
}

function push(courses, status) {
    status = status || "Courses";
    $("#status").html(status);

    stack = courses;
    window.stack = stack;
    render();
}

/* Render an array of cards into the deck. If no array is provided, render the stack*/
function render(courses, status) {
    status = status || "Courses";
    $("#status").html(status);

    stack = courses;
    window.stack = stack;

    //console.log(stack);

    let cards = stack.map(card);

    $('#deck').empty()
    for (let card of cards) {
        $('#deck').append(card);
    }
    for (let el of $(".card-text")) {
        $clamp(el, {
            clamp: 3
        });
    }

    return 0;
}

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
            <button class="btn btn-success btn-sm" onclick="add('${course.subject}${course.catalogNbr}')">Add</button>
            <button class="btn btn-danger btn-sm" onclick="remove('${course.subject}${course.catalogNbr}')">Remove</button>
        </div>
    </div>`;

    return html
}

/* Get grokked course for a particular code */
async function info(code) {
    let semester = "FA19";
    let dept = code.slice(0, -4);

    let options = {
        uri: `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&subject=${dept}`,
        json: true
    }

    let r = new Request(options.uri);
    return await fetch(r);
}

async function infoAll(codes) {
    const tasks = codes.map(info);
    const results = await Promise.all(tasks);

    function getCourseFromBody(body, code) {
        const num = code.slice(-4);

        for (let course of body.data.classes) {
            if (course.catalogNbr == num) {
                return grok(course);
            }
        }
    }

    let courses = []
    for (let i = 0; i < codes.length; i++) {
        courses.push(getCourseFromBody(results[i], codes[i]));
    }

    return courses;
}

/* Get an array of popular courses based on the selected major */
async function get_popular() {
    let popular_codes = ["CS1110", "CS2110", "CS2800", "CS3110"]
    popular.length = 0;

    //popular = await infoAll(popular_codes).then((v) => v);
    infoAll(popular_codes).then((courses) => render(courses, "Popular"));

    //render(popular, "Popular");

    return popular;
}

/* Get an array of grokked courses matching a particular search query */
function search(query) {
    let value = $('input')[0].value;
    query = query || value;

    let semester = "FA19";
    let url = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&q=${query}&subject=${major}`;

    let r = new Request(url);
    fetch(r)
        .then(resp => {
            if (!resp.ok) {
                alert("something went wrong!");
            }
            return resp.json();
        })
        .then(body => {
            window.body = body;
            let data = body.data;
            search_results = data.classes.map(grok);
            render(search_results, "Search");
        });
}

$(document).ready(function () {
    $("#search").click(() => search());
});

/* Get an array of recommended courses based on the preferences list */
function recommend(codes) {
    codes = codes || pref;

    recs.length = 0;

    // Get recommended courses
    let rec_codes = ["CS2800", "CS2110", "CS4820"];

    for (let code of rec_codes) {
        info(code, (course) => recs.push(course));
    }
    render(recs, "Recommendations")

    return recs;
}

window.stack = stack;
window.search_results = search_results;
window.popular = popular;
window.recs = recs;

window.pref = pref;

window.add = add;
window.remove = remove;

window.render = render;

window.push = push;
window.info = info;
window.infoAll = infoAll;
window.search = search;
window.recommend = recommend;
window.get_popular = get_popular;
window.search = search;
