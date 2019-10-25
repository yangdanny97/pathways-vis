var d3 = require('d3');

import 'bootstrap';

import '../style/pathways.scss';

var vis = d3.select("#vis");
var grid = 100;
var data = [];
var data_recs = [];

// Get major from url query string
let urlParams = new URLSearchParams(window.location.search);
const major = urlParams.get('major');

// Put major in title bar
d3.select('#major').node().innerHTML = major;

// HTML element anchors
var mode = d3.select('#status').node();
var deck = d3.select('#deck').node();
var searchbar = d3.select('input').node();

// Load classes
var stack = [];

var popular = []
var recs = [];
var search_results = [];

var pref = new Set()

/* Add a class to the list of preferred classes */
function add(code) {
    pref.add(code);
    // TODO this is where the search -> grid course adding would go
    // missing the smart semester selection
    // addCourse(code, ___)
    window.pref = pref;
}

/* Remove a class from the list of preferred classes */
function remove(code) {
    pref.delete(code);
    window.pref = pref;
}

function push(courses, status) {
    status = status || "Courses";
    mode.html(status);

    stack = courses;
    window.stack = stack;
    render();
}

/* Render an array of cards into the deck. If no array is provided, render the stack*/
function render(courses, status) {
    status = status || "Courses";
    mode.html(status);

    stack = courses;
    window.stack = stack;

    //console.log(stack);

    let cards = stack.map(card);

    deck.empty()
    for (let card of cards) {
        deck.append(card);
    }
    for (let el of d3.selectAll(".card-text").nodes()) {
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
var search = function(query) {
    let value = searchbar.value;
    query = query || value;

    let semester = "FA19";
    let url = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&q=${query}&subject=${major}`;

    let r = new Request(url);
    fetch(r)
        .then(resp => {
            if (!resp.ok) {
                alert("Invalid query - please try a different search");
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

// /* Get an array of recommended courses based on the preferences list */
// function recommend(codes) {
//     codes = codes || pref;

//     recs.length = 0;

//     // Get recommended courses
//     let rec_codes = ["CS2800", "CS2110", "CS4820"];

//     for (let code of rec_codes) {
//         info(code, (course) => recs.push(course));
//     }
//     render(recs, "Recommendations")

//     return recs;
// }

// course and recommendation factory methods
function COURSE(name, row, col) {
    return {
        Type: "course",
        Name: name,
        Row: row,
        Col: col
    };
}

function REC(suggestions, row, col) {
    return {
        Type: "rec",
        Recs: suggestions,
        Row: row,
        Col: col
    };
}

function init() {
    // TODO load core courses graphs instead of defaulting to CS
    // for now, hardcode initial CS courses
    data.push(COURSE("CS1110", 0, 0));
    data.push(COURSE("MATH1920", 0, 1));
    data.push(COURSE("PHYS2213", 0, 2));
    data.push(COURSE("CS2110", 1, 0));
    data.push(COURSE("CS2800", 1, 1));
    data.push(COURSE("CS3110", 2, 0));
    data.push(COURSE("CS3410", 3, 0));
    data.push(COURSE("CS4820", 4, 0));
    data.push(COURSE("CS4410", 5, 0));

    updateRecs();
}

function updateRecs() {
    var reqbody = {
        Major: major,
        Courses: data
    };
    var req = new Request('/rec/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });
    fetch(req)
        .then(resp => resp.json())
        .then(d => {
            data_recs = d.Recs;
            displayCourses();
        });
}

function addCourse(cname, row) {
    // console.log(`ADD ${cname}`);
    var rowsize = data.filter(x => x.Row == row).length;
    if (rowsize < 6) {
        data.push(COURSE(cname, row, rowsize));
        updateRecs();
    }
}

function deleteCourse(c) {
    var row = c.Row,
        col = c.Col;
    // console.log(`DELETE ${c.Name}`);
    data = data.filter(x => x.Name !== c.Name); // remove
    data.map(x => { //shift to left
        if (x.Row == row && x.Col > col) {
            x.Col = x.Col - 1;
        }
    });
    updateRecs();
}

// grid layout helpers
function getX(d) {
    return 25 + d.Col * grid * 1.2;
}

function getY(d) {
    return 25 + d.Row * grid * 1.2;
}

function displayCourses() {
    // console.log(data);
    // console.log(data_recs);
    var courses = vis.selectAll(".course").data(data, d => d.Name);
    var recs = vis.selectAll(".recs").data(data_recs);
    courses.exit().remove();
    recs.exit().remove();

    //update position
    courses.transition()
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .duration(500);
    recs.transition()
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .duration(500);
    recs.selectAll("rect").remove();
    recs.selectAll("text").remove();
    for (var idx = 0; idx < 3; idx++) {
        const i = idx;
        recs.append("rect")
            .attr("width", grid)
            .attr("height", grid / 3)
            .attr("y", d => d.Recs.length > i ? grid / 3 * i : -1000)
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .attr("fill", "gray")
            .on("click", d => addCourse(d.Recs[i], d.Row));

        recs.append("text")
            .attr('text-anchor', "middle")
            .attr("font-size", "15px")
            .text(d => d.Recs[i])
            .attr("x", grid * 0.5)
            .attr("y", d => d.Recs.length > i ? grid / 3 * i + 20 : -1000)
            .attr("fill", "white")
            .on("click", d => addCourse(d.Recs[i], d.Row));
    }

    // add course
    var course = courses.enter().append("g")
        .attr("class", "course")
        .on("click", d => deleteCourse(d))
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .style("opacity", 0);

    course.transition()
        .style("opacity", 1)
        .duration(500);

    course.append("rect")
        .attr("width", grid)
        .attr("height", grid)
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("fill", "crimson");

    course.append("text")
        .attr('text-anchor', "middle")
        .attr("font-size", "20px")
        .text(d => d.Name)
        .attr("x", grid * 0.5)
        .attr("y", grid * 0.6)
        .attr("fill", "white");

    //add recs
    var rec = recs.enter().append("g")
        .attr("class", "recs")
        .attr("transform", d => `translate(0 ${getY(d)})`);

    rec.transition()
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .duration(500);

    for (var idx = 0; idx < 3; idx++) {
        const i = idx;
        rec.append("rect")
            .attr("width", grid)
            .attr("height", grid / 3)
            .attr("y", d => d.Recs.length > i ? grid / 3 * i : -1000)
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .attr("fill", "gray")
            .on("click", d => addCourse(d.Recs[i], d.Row));

        rec.append("text")
            .attr('text-anchor', "middle")
            .attr("font-size", "15px")
            .text(d => d.Recs[i])
            .attr("x", grid * 0.5)
            .attr("y", d => d.Recs.length > i ? grid / 3 * i + 20 : -1000)
            .attr("fill", "white")
            .on("click", d => addCourse(d.Recs[i], d.Row));
    }
}

/*
d3.select(document).node().ready(function () {
    d3.select("#search").node().click(() => search());
    init();
});
*/
init();

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
//window.recommend = recommend;
window.get_popular = get_popular;
window.search = search;
