var d3 = require('d3');

import 'bootstrap';

import '../style/pathways.scss';

var vis = d3.select("#vis");
// size of grid
var grid = 120;
// current courses
var data = [];
// current recs
var data_recs = [];
// semester selection tiles
var sem_select = [];
var selected_sem = -1;

// TRUE == LIMIT SAME DEPARTMENT COURSE SUGGESTIONS
var limitDept = true;

var courses;
var selectbtns;

// Get major from url query string
let urlParams = new URLSearchParams(window.location.search);
const major = urlParams.get('major');


var req = new Request("/majors/", {
    method: 'POST',
});
fetch(req)
    .then(resp => resp.json())
    .then(json => json.filter(obj => obj.Code == major)[0])
    .then(obj => d3.select("#major").node().innerHTML = obj.Major);

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
    var reqbody = {
        Major: major.toLowerCase(),
        Course: code,
        Courses: data,
    };
    // if no semester is selected, then smart-add
    if (selected_sem == -1) {
        var req = new Request('/smart_add/', {
            method: 'POST',
            body: JSON.stringify(reqbody)
        });

        fetch(req)
            .then(resp => resp.json())
            .then(d => {
                addCourse(code, d.Row);
            });
    } else {
        addCourse(code, selected_sem);
    }
}

/* Remove a class from the list of preferred classes */
function remove(code) {
    // console.log(code);
    var c = data.find(x => x.Name === code);
    if (c) {
        deleteCourse(c);
    }
}

//logging to google Stackdriver
function log(message) {
    var reqbody = {
        Message: message,
    };

    var req = new Request('/log/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });

    fetch(req);
}

function push(courses, status) {
    status = status || "Courses";
    mode.innerHTML = status;

    stack = courses;
    window.stack = stack;
    render();
}

/* Render an array of grokked courses into the deck. If no array is provided, render the stack */
function render(courses, status, displayAdd = true, displayRemove = true) {
    status = status || "Courses";
    mode.innerHTML = status;

    stack = courses.filter(c => c !== undefined);
    window.stack = stack;

    //console.log(stack);

    let cards = stack.map(x => card(x, displayAdd, displayRemove));

    deck.innerHTML = ""
    for (let card of cards) {
        deck.innerHTML += card;
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
        link: `https://classes.cornell.edu/browse/roster/${course._sem}/class/${course.subject}/${course.catalogNbr}`,
        credits: "? cr"
    }

    // apparently this credit selection doesn't always work
    try {
        trim.credits = `${course.enrollGroups[0].unitsMinimum} cr`;
    } catch (_) {
        return trim;
    }

    return trim;
}

/* Get an html card for a grokked course */
function card(course, displayAdd = true, displayRemove = true) {

    let html = `<div class='card'>
        <div class='card-header'>
            <div class='code'>${course.subject} ${course.catalogNbr}</div>
            <div class='name'><a href="${course.link}" target="_blank">${course.titleShort}</a></div>
            <div class='cred'>${course.credits}</div>
        </div>
        <div class="card-body">
            <p class="card-text">${course.description}</p>
            <a class="btn btn-primary btn-sm" href="${course.link}" role="button" target="_blank">Details</a>
            ${(displayAdd) ? `<button class="btn btn-success btn-sm" onclick="add('${course.subject}${course.catalogNbr}')">Add</button>` : ""}
            ${(displayRemove) ? `<button class="btn btn-danger btn-sm" onclick="remove('${course.subject}${course.catalogNbr}')">Remove</button>` : ""}
        </div>
    </div>`;

    return html
}


/* Get grokked course for a particular code */
async function info(code) {
    let semesters = ["FA19", "SP20", "SP19", "FA18"];
    let dept = code.slice(0, -4);

    for (let semester of semesters) {
        let uri = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&subject=${dept}`;

        function getCourseFromBody(body, code) {
            const num = code.slice(-4);

            for (let course of body.data.classes) {
                if (course.catalogNbr == num) {
                    return grok(course, semester);
                }
            }
        }

        const response = await fetch(uri);
        const p = await response.json();

        let g = getCourseFromBody(p, code);
        if (g != undefined) return g;
    }
}

/* Get an array of grokked courses from an array of course codes */
async function infoAll(codes) {
    return Promise.all(codes.map(info).filter(x => x !== undefined));
}

/* Get an array of popular courses based on the selected major */
async function get_popular() {

    var reqbody = {
        Major: major.toLowerCase(),
        Courses: data
    };

    var req = new Request('/core_courses/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });

    popular = await fetch(req)
        .then(resp => resp.json())
        .then(d => d.Courses.map(c => c.Name))
        .then(infoAll);

    window.popular = popular;

    return popular;
}

/* Get an array of grokked courses matching a particular search query */
var search = function (query) {
    log(`search|${major}|${query}`);
    let value = searchbar.value;
    query = query || value;

    let semester = "SP20";
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
            search_results = data.classes.map(grok, semester);
            render(search_results, "Search");
        });
}

/* Get an array of recommended courses based on the preferences list */
async function recommend(codes) {
    codes = codes || pref;

    var reqbody = {
        Major: major.toLowerCase(),
        Courses: data,
        LimitDept: limitDept
    };

    var req = new Request('/unordered_rec/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });

    recs.length = 0; // Empty the list of recommendations

    recs = await fetch(req)
        .then(resp => resp.json())
        .then(json => json.Codes)
        .then(infoAll);

    window.recs = recs;

    return recs;
}

// course and recommendation factory methods
function COURSE(name, row, col) {
    return {
        Type: "course",
        Name: name,
        Row: row,
        Col: col
    };
}

function SELECT(row, col) {
    return {
        Type: "select",
        Row: row,
        Col: col
    };
}

function init() {
    console.log(major);
    // displaySemesters();
    var reqbody = {
        Major: major.toLowerCase(),
        Courses: data
    };
    var req = new Request('/core_courses/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });
    fetch(req)
        .then(resp => resp.json())
        .then(d => {
            data = d.Courses;
            console.log(d.Courses);
            for (var i = 0; i < 8; i++) {
                var c_sem = data.filter(c => c.Row === i).map(c => c.Col);
                if (c_sem.length == 0) {
                    sem_select.push(SELECT(i, 0));
                } else {
                    sem_select.push(SELECT(i, Math.max(...c_sem) + 1));
                }
            }
            updateRecs();
        });
}

async function updateRecs(callback) {
    // console.log(data);
    var reqbody = {
        Major: major.toLowerCase(),
        Courses: data,
        LimitDept: limitDept
    };
    var req = new Request('/rec/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });
    fetch(req)
        .then(resp => resp.json())
        .then(d => {
            // console.log(d.Edges);
            data_recs = d.Recs;
            displayCourses();
            if (callback !== undefined) {
                callback();
            }
        });
}

// cname is string, row is int
function addCourse(cname, row) {
    log(`add|${major}|${cname}`);
    pref.add(cname);
    window.pref = pref;
    // console.log(`ADD ${cname}`);
    if (data.find(x => x.Name === cname)) {
        alert("course is already selected")
        return
    }
    var rowsize = data.filter(x => x.Row == row).length;
    if (rowsize < 6) {
        sem_select.filter(x => x.Row == row)[0].Col++;
        data.push(COURSE(cname, row, rowsize));
        updateRecs(() => selectSem(row));
    } else {
        alert("cannot add more than 6 courses per group")
    }
}

//c is a Course object
function deleteCourse(c) {
    log(`delete|${major}|${c.Name}`);
    var row = c.Row,
        col = c.Col;
    // console.log(`DELETE ${c.Name}`);
    data = data.filter(x => x.Name !== c.Name); // remove
    sem_select.filter(x => x.Row == row)[0].Col--;
    data.map(x => { //shift to left
        if (x.Row == row && x.Col > col) {
            x.Col = x.Col - 1;
        }
    });
    pref.delete(c.Name);
    window.pref = pref;
    updateRecs(() => selectSem(c.Row));
}

// grid layout helpers
function getX(d) {
    return 30 + d.Col * grid * 1.1 + grid / 2;
}

function getY(d) {
    return 30 + d.Row * grid * 1.1 + grid / 2;
}

async function selectSem(n) {
    selected_sem = n;
    d3.selectAll(".sem").attr("fill", "none");
    d3.selectAll(`.sem${n}`).attr("fill", "pink");
    var sem_recs = data_recs.filter(d => d.Row == n);
    var rec_names = [];
    sem_recs.forEach(sr => sr.Recs.forEach(r => rec_names.push(r)));
    var rec_info = await infoAll(rec_names);
    render(rec_info, `Group ${n+1} Recommendations`, true, false);
}

//displays menu next to course when clicked
function makeContextMenu(d, type, row = 0) {
    let options = [];
    let courseCode = "";
    if (type == "REC") {
        courseCode = d;
        options = ["Add", "More Info"];
    } else if (type == "COURSE") {
        courseCode = d.Name;
        options = ["Remove", "More Info"];
    }

    d3.selectAll(".context-menu")
        .data([1])
        .enter()
        .append("div")
        .attr("class", "context-menu");
    d3.select("body").on("click.context-menu", function () {
        d3.select(".context-menu").style("display", "none");
    })
    d3.selectAll(".context-menu")
        .html("")
        .append("ul")
        .selectAll("li")
        .data(options)
        .enter()
        .append("li")
        .on("click", function (command) {
            if (command == "Remove") {
                deleteCourse(d);
            } else if (command == "More Info") {
                info(courseCode).then(v => window.open(v.link));
            } else if (command == "Add") {
                addCourse(courseCode, row);
            }
            d3.select('.context-menu').style('display', 'none');
        })
        .text(d => d);
    d3.select('.context-menu')
        .style('left', (d3.event.pageX - 2) + 'px')
        .style('top', (d3.event.pageY - 2) + 'px')
        .style('display', 'block');
    d3.event.preventDefault();
}

function displayCourses() {
    let data_links = [];
    for (let edge of data_edges){
        data_links.push({"source":edge["Source"],"target":edge["Destination"]})
    }

    //arrowhead
    vis.append('defs').append('marker')
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 13)
        .attr("refY", 0)
        .attr("markerWidth", 9)
        .attr("markerHeight", 9)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5 L10,0 L0,5")
        .attr('fill', "black")
        .style('stroke', 'none');

    courses = vis.selectAll(".course").data(data, d => d.Name);
    selectbtns = vis.selectAll(".sem_select").data(sem_select, d => d.Row);;
    courses.exit().remove();

    //update position
    courses.transition()
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .duration(500);

    selectbtns.transition()
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .duration(500);

    // add course
    var course = courses.enter().append("g")
        .attr("class", "course")
        .on("click", d => deleteCourse(d))
        .on("contextmenu", d => makeContextMenu(d, "COURSE"))
        .on("mouseover", async d => {
            var c = await info(d.Name);
            render([c], "Course Info (Click to Delete)", false, false);
        })
        .on("mouseout", () => {
            if (selected_sem != undefined && selected_sem != -1) {
                selectSem(selected_sem);
            } else {
                recommend().then(c => render(c, "Recommended Courses", true, false));
            }
        })
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .style("opacity", 0);

    course.transition()
        .style("opacity", 1)
        .duration(500);

    course.append("circle")
        .attr("r", grid / 2)
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("fill", d => {
            var major = urlParams.get('major');
            return (d.Name.slice(0, major.length) == major) ? "darkred" : "crimson";
        });

    course.append("text")
        .attr('text-anchor', "middle")
        .attr("font-size", "18px")
        .on("mouseover", async d => {
            var c = await info(d.Name);
            render([c], "Course Info", false, true);
        })
        .text(d => d.Name)
        .attr("x", 0)
        .attr("y", 9)
        .attr("fill", "white");

    let links = viz.selectAll(".link").data(data_links);
    let link = links.enter().append("line")
        .attr("class","link")
        .attr("x1", d => getX(d => getX(d.source)))
        .attr("x2", d => getX(d => getX(d.target)))
        .attr("y1", d => getY(d => getX(d.source)))
        .attr("y2", d => getY(d => getX(d.target)))
        .attr("marker-end", "url(#arrowhead)");

    var selectbtn = selectbtns.enter().append("g")
        .attr("class", "sem_select")
        .on("click", d => {
            if (d.Row != selected_sem) {
                selectSem(d.Row);
            } else {
                // deselecting a semester
                selected_sem = -1;
                d3.selectAll(".sem").attr("fill", "none");
                recommend().then(c => render(c, "Recommended Courses", true, false));
            }
        })
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .style("opacity", 0);

    selectbtn.transition()
        .style("opacity", 1)
        .duration(500);

    selectbtn.append("circle")
        .attr("class", d => `sem sem${d.Row}`)
        .attr("r", grid / 2)
        .attr("stroke", "gray")
        .attr("stroke-dasharray", "8 4")
        .attr("stroke-width", 3)
        .attr("fill", "none");

    selectbtn.append("text")
        .attr('text-anchor', "middle")
        .attr("font-size", "64px")
        .text("+")
        .attr("x", 0)
        .attr("y", 16)
        .attr("fill", "gray");
}

init();

recommend().then(c => render(c, "Recommended Courses", true, false));

// auto-schedule generation
// adds a lot of courses all at once before refreshing
d3.select("#auto-gen").on("click", () => {
    for (var i = 0; i < 8; i++) {
        var c_sem = data.filter(c => c.Row === i);
        var sem_recs = data_recs.filter(d => d.Row == i);
        var rec_names = [];
        sem_recs.forEach(sr => sr.Recs.forEach(r => rec_names.push(r)));
        for (var j = 0; j < 6 - c_sem.length; j++) {
            var cname = rec_names[j];
            console.log(cname);
            data.push(COURSE(cname, i, c_sem.length + j));
        }
    }
    updateRecs();
});

window.d3 = d3;

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

window.data = data;
window.sem_select = sem_select;
window.selected_sem = selected_sem;
