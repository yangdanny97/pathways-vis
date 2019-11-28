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
// current edges
var data_edges = [];
// semester selection tiles
var sem_select = [];
var selected_sem = -1;
var selected_course = "";

var render_id = "";

// TRUE == LIMIT SAME DEPARTMENT COURSE SUGGESTIONS
var limitDept = (d3.select('input[name="tuning"]:checked').node().value == "diversity");

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
    if (status !== render_id) return;
    status = status || "Courses";
    mode.innerHTML = status;

    stack = courses.filter(c => c !== undefined);
    window.stack = stack;

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
    return;
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
        credits: "? units"
    }

    // apparently this credit selection doesn't always work
    try {
        trim.credits = `${course.enrollGroups[0].unitsMinimum} units`;
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
    render_id = "Search";
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
    //arrowhead
    vis.append('defs').append('svg:marker')
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 13)
        .attr("refY", 0)
        .attr("markerWidth", 15)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .attr("viewbox", "-5 -5 10 10")
        .append("svg:path")
        .attr("d", "M0,-5 L10,0 L0,5")
        .attr('fill', "black")
        .style('stroke', 'none');

    vis.append('defs').append('svg:marker')
        .attr("id", "arrowhead_selected")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 13)
        .attr("refY", 0)
        .attr("markerWidth", 15)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .attr("viewbox", "-5 -5 10 10")
        .append("svg:path")
        .attr("d", "M0,-5 L10,0 L0,5")
        .attr('fill', "blue")
        .style('stroke', 'none');
}

async function updateRecs(callback) {
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
            data_edges = d.Edges;
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
        alert("cannot add more than 6 courses per semester");
    }
}

//c is a Course object
function deleteCourse(c) {
    log(`delete|${major}|${c.Name}`);
    var row = c.Row,
        col = c.Col;
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
    return 50 + d.Col * grid * 1.1 + grid / 2;
}

function getY(d) {
    return 30 + d.Row * grid * 1.25 + grid / 2;
}

async function selectSem(n) {
    selected_sem = n;
    d3.selectAll(".sem").attr("fill", "none");
    d3.selectAll(`.sem${n}`).attr("fill", "pink");
    d3.selectAll(`.selectText2`).text("Add Courses");
    d3.selectAll(`.selectText2_${n + 1}`).text("Selected");
    var sem_recs = data_recs.filter(d => d.Row == n);
    var rec_names = [];
    sem_recs.forEach(sr => sr.Recs.forEach(r => rec_names.push(r)));
    var rec_info = await infoAll(rec_names);
    render_id = `Semester ${n+1} Recommendations`;
    render(rec_info, `Semester ${n+1} Recommendations`, true, false);
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
    let nodeMap = new Map();
    data.forEach(d => nodeMap.set(d.Name, d));
    data_edges.forEach(d =>
        data_links.push({
            "source": nodeMap.get(d.Source),
            "target": nodeMap.get(d.Destination)
        }))

    for (var s = 0; s < 8; s++) {
        vis.append("text")
            .attr('text-anchor', "middle")
            .attr("font-size", "18px")
            .text(`${s+1}`)
            .attr("x", 25)
            .attr("y", getY({
                Row: s
            }))
            .attr("fill", "black");
    }

    let links = vis.selectAll(".link")
        .data(data_links, d => d.source.Name + d.source.Row.toString() +
            d.target.Name + d.target.Row.toString());
    links.exit().remove();
    let polylinePoints = function (d) {
        let x1 = getX(d.source);
        let x2 = getX(d.target);
        let y1 = getY(d.source) + 14;
        let y2 = getY(d.target);
        return x1 + "," + y1 + " " + (x1 + x2) / 2 + "," + (y1 + y2) / 2 + " " + x2 + "," + y2;
    }
    links.transition() //update position
        .attr("points", d => polylinePoints(d)).duration(500);
    let link = links.enter().append("polyline")
        .attr("class", d => `link src_${d.source.Name} dst_${d.target.Name}`)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("points", d => polylinePoints(d))
        .attr("marker-mid", "url(#arrowhead)")
        .style("opacity", 0);
    link.transition().style("opacity", 1).duration(500);
    vis.selectAll("polyline").sort(function (a, b) {
        return -1;
    }) //put to back of viz

    courses = vis.selectAll(".course").data(data, d => d.Name);
    selectbtns = vis.selectAll(".sem_select").data(sem_select, d => d.Row);
    courses.exit().remove();

    //update position
    courses.transition()
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .duration(500);

    selectbtns.transition()
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .duration(500);


    d3.selection.prototype.moveToFront = function () {
        return this.each(function () {
            this.parentNode.appendChild(this);
        });
    };

    courses.moveToFront();
    // add course
    var course = courses.enter().append("g")
        .attr("class", "course")
        .on("contextmenu", d => makeContextMenu(d, "COURSE"))
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .style("opacity", 0);

    course.transition()
        .style("opacity", 1)
        .duration(500);

    course.append("circle")
        .attr("id", d => `circle_${d.Name}`)
        .attr("r", grid / 2)
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("fill", d => {
            var major = urlParams.get('major');
            return (d.Name.slice(0, major.length) == major) ? "darkred" : "crimson";
        });

    course.append("text")
        .attr("id", d => `text_${d.Name}`)
        .attr('text-anchor', "middle")
        .attr("font-size", "18px")
        .text(d => d.Name)
        .attr("x", 0)
        .attr("y", 9)
        .attr("fill", "white");

    course.append("circle")
        .attr("r", grid / 2)
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("fill", "white")
        .style("opacity", 0)
        .on("click", async d => {
            if (selected_course === d.Name) {
                //deselect
                d3.select(`#circle_${d.Name}`).attr("stroke", "black");
                if (selected_sem != undefined && selected_sem != -1) {
                    selectSem(selected_sem);
                } else {
                    render_id = "Recommended Courses";
                    recommend().then(c => render(c, "Recommended Courses", true, false));
                }
                selected_course = undefined;
                d3.selectAll(".link").attr("stroke", "black").attr("marker-mid", "url(#arrowhead)");
            } else {
                //select
                d3.select(`#circle_${d.Name}`).attr("stroke", "blue");
                d3.selectAll(`.src_${d.Name}`).attr("stroke", "blue")
                    .attr("marker-mid", "url(#arrowhead_selected)");
                d3.selectAll(`.dst_${d.Name}`).attr("stroke", "blue")
                    .attr("marker-mid", "url(#arrowhead_selected)");
                selected_course = d.Name;
                selected_sem = d.Row;
                var c = await info(d.Name);
                render_id = "Course Info";
                render([c], "Course Info", false, true);
            }
        });

    var selectbtn = selectbtns.enter().append("g")
        .attr("class", "sem_select")
        .on("click", d => {
            if (d.Row != selected_sem) {
                selectSem(d.Row);
            } else {
                // deselecting a semester
                selected_sem = -1;
                d3.select(`.selectText2_${d.Row + 1}`).text("Add Courses");
                d3.selectAll(".sem").attr("fill", "none");
                render_id = "Recommended Courses";
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

    // selectbtn.append("text")
    //     .attr("class", d => `selectText1 selectText1_${d.Row + 1}`)
    //     .attr('text-anchor', "middle")
    //     .attr("font-size", "18px")
    //     .text("View")
    //     .attr("x", 0)
    //     .attr("y", -6)
    //     .attr("fill", "gray");

    selectbtn.append("text")
        .attr("class", d => `selectText2 selectText2_${d.Row + 1}`)
        .attr('text-anchor', "middle")
        .attr("font-size", "18px")
        .text("Add Courses")
        .attr("x", 0)
        .attr("y", 9)
        .attr("fill", "gray");

    selectbtn.append("text")
        .text(d => `Semester ${d.Row + 1}`)
        .attr("font-size", "18px")
        .attr("x", grid * 0.6)
        .attr("y", 9)
        .attr("fill", "gray");

}

init();

render_id = "Recommended Courses";
recommend().then(c => render(c, "Recommended Courses", true, false));

var fill_per_sem = 4;
// auto-schedule generation
// adds a lot of courses all at once before refreshing
d3.select("#auto-gen").on("click", () => {
    for (var i = 0; i < 8; i++) {
        var c_sem = data.filter(c => c.Row === i);
        var sem_recs = data_recs.filter(d => d.Row == i);
        var rec_names = [];
        sem_recs.forEach(sr => sr.Recs.forEach(r => rec_names.push(r)));
        for (var j = 0; j < fill_per_sem - c_sem.length; j++) {
            var cname = rec_names[j];
            data.push(COURSE(cname, i, c_sem.length + j));
        }
        sem_select.forEach(d => {
            d.Col = fill_per_sem;
        });
    }
    updateRecs();
});

d3.selectAll(".tuning").on("change", () => {
    limitDept = (d3.select('input[name="tuning"]:checked').node().value == "diversity");
    updateRecs(() => {
        if (selected_sem !== -1 && selected_sem !== undefined) {
            selectSem(selected_sem);
        } else {
            recommend().then(c => render(c, "Recommended Courses", true, false));
        }
    });
});

// choosing courses
function choosingCourses() {
    let majorCourses = [];
    let chosenCourses = [];
    var reqbody = {
        Major: major.toLowerCase(),
        Courses: data
    };
    var req = new Request('/major_courses/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });
    fetch(req)
        .then(resp => resp.json())
        .then(d => {
            d.Courses.forEach(course => majorCourses.push(course.Name));
            majorCourses.forEach(function (course) {
                let table = d3.select("#menu");
                let tbody = table.select("tbody");
                let tr = tbody.append("tr");
                tr.append("td").text(course)
                    .on("click", function () {
                        let ele = d3.select(this);
                        if (ele.attr("class") == "hover") {
                            ele.attr("class", "");
                        } else {
                            ele.attr("class", "hover");
                        }
                    });
            })
        });

    d3.select("#updatecourses").on("click", function () {
        chosenCourses = [];
        d3.select("#menu").selectAll("td").each(function (_, i) {
            if (d3.select(this).attr("class") == "hover") {
                chosenCourses.push(majorCourses[i]);
            }
        });

        data = [];
        sem_select = [];
        var reqbody = {
            Major: major.toLowerCase(),
            Selected: chosenCourses,
            Courses: [],
        };
        var req = new Request('/multiple_smart_add/', {
            method: 'POST',
            body: JSON.stringify(reqbody)
        });
        fetch(req)
            .then(resp => resp.json())
            .then(d => {
                data = d.Courses;
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
    })
}
choosingCourses();

// function resort(){
//     let edgeCount = {};
//     let nodeMap = new Map();
//     data.forEach(d => {
//         edgeCount[d.Name] =  {"row":d.Row, "outedges":0, "inedges":0};
//         nodeMap.set(d.Name, d);
//     });
//     data_edges.forEach(d =>{
//         edgeCount[d.Source]["outedges"] += 1;
//         edgeCount[d.Destination]["inedges"] += 1;
//     });

//     for(let key in Object.keys(edgeCount)){
//         let value = edgeCount[key];

//     }
// }

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
