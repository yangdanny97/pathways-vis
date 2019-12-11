var d3 = require('d3');
var $ = require('jquery');

import 'bootstrap';

import '../style/pathways.scss';

var vis = d3.select("#vis");
// size of grid
var grid = 120;
// array of course objects
var data = [];
// array of rec objects (currently not displayed on grid)
var data_recs = [];
// array of edges between courses
var data_edges = [];
// semester selection tiles (one per row)
var sem_select = [];
// currently selected semester
var selected_sem;
// name of currently selected course
var selected_course;
// name to display on RHS card list
var render_id = "";

// LIMIT SAME DEPARTMENT COURSE SUGGESTIONS
var limitDept = d3.select("input[name='tuning']:checked").node().value == "diversity";

// courses and semester select grid elements
var courses;
var selectbtns;

// Get major from url query string
let urlParams = new URLSearchParams(window.location.search);
const major = urlParams.get('major');

$(function () {
    $('[data-toggle="tooltip"]').tooltip()
})

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
var searchbar = d3.select('#search').node();

// Load classes
var stack = [];
var recs = [];
var search_results = [];
var pref = new Set()

/* RHS add button, wraps addCourse */
function add(code, details = undefined) {
    var reqbody = {
        Major: major.toLowerCase(),
        Course: code,
        Courses: data,
    };
    // if no semester is selected, then smart-add
    if (selected_sem === undefined) {
        var req = new Request('/smart_add/', {
            method: 'POST',
            body: JSON.stringify(reqbody)
        });

        fetch(req)
            .then(resp => resp.json())
            .then(d => {
                addCourse(code, d.Row, false, details);
            });
    } else {
        addCourse(code, selected_sem, details);
    }
}

/* RHS delete button, wraps deleteCourse */
function remove(code) {
    var c = data.find(x => x.Name === code);
    if (c) {
        deleteCourse(c, false);
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
        deck.append(card);
    }
    for (let el of d3.selectAll(".card-text").nodes()) {
        $clamp(el, {
            clamp: 3
        });
    }
    return;
}

/* Package the API course data into a smaller, neater object */
function grok(course, semester) {
    let trim = {
        subject: course.subject,
        catalogNbr: course.catalogNbr,
        titleLong: course.titleLong,
        titleShort: course.titleShort,
        description: course.description,
        link: `https://classes.cornell.edu/browse/roster/${semester}/class/${course.subject}/${course.catalogNbr}`,
        credits: "? units",
        whenOffered: course.catalogWhenOffered,
        comments: course.catalogComments,
        prereq: course.catalogPrereqCoreq
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
    let html = `<div class='card-header'>
            <div class='code'>${course.subject} ${course.catalogNbr}</div>
            <div class='name'><a href="${course.link}" target="_blank">${course.titleShort}</a></div>
            <div class='cred'>${course.credits}</div>
        </div>
        <div class="card-body">
            <p class="card-text">${course.description}</p>
            <button class="btn btn-primary btn-sm info" data-toggle="modal" data-target="#deets">More Info</button>
            ${(displayAdd) ? `<button class="btn btn-success btn-sm add">Add</button>` : ""}
            ${(displayRemove) ? `<button class="btn btn-danger btn-sm remove">Remove</button>` : ""}
        </div>`;

    let c = d3.create("div").attr("class", "card").html(html);

    c.select('button.info').on('click', () => preview_class(course, displayAdd, displayRemove));
    c.select('button.add').on('click', () => add(course.subject + course.catalogNbr, course));
    c.select('button.remove').on('click', () => remove(course.subject + course.catalogNbr));

    return c.node();
}

/* Add the data for a grokked course into the modal overlay */
function preview_class(course, displayAdd = true, displayRemove = true) {

    let m_html = `<div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <span class="code">${course.subject} ${course.catalogNbr}</span>
                <h5 class="modal-title">${course.titleLong}</h5>
                <span class="credits">${course.credits}</span>
                <button type="button" class="close" data-dismiss="modal">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <p class='link'>View this class on the <a href="${course.link}" target="_blank">course roster</a></p>
                <p class='course-desc'>${course.description}</p>
                <p class='when-offered'><strong>Offered in:</strong> ${course.whenOffered}</p>
                ${course.comments ? `<p><strong>Comments:</strong> ${course.comments}</p>` : ""}
                ${course.prereq ? `<p><strong>Prerequisites/Corequisites:</strong> ${course.prereq}</p>` : ""}
            </div>
            <div class="modal-footer">
                ${(displayAdd) ? `<button class="btn btn-success" onclick="add('${course.subject}${course.catalogNbr}')" data-dismiss="modal">Add</button>` : ""}
                ${(displayRemove) ? `<button class="btn btn-danger" onclick="remove('${course.subject}${course.catalogNbr}')" data-dismiss="modal">Remove</button>` : ""}
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>`;
    d3.select("#deets").html(m_html);
}


/* Get grokked course for a particular code */
async function info(code) {
    //console.log("Making request: ", code);
    let semesters = ["SP20", "FA19", "SP19", "FA18"];
    let dept = code.slice(0, -4);
    let num = code.slice(-4);

    for (let semester of semesters) {
        let uri = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&subject=${dept}`;

        function getCourseFromBody(body, num) {
            for (let course of body.data.classes) {
                if (course.catalogNbr === num.toString()) {
                    return grok(course, semester);
                }
            }
        }

        const response = await fetch(uri);
        if (!response.ok) continue;
        const body = await response.json();
        if (body.data === undefined) continue;
        const grokked = getCourseFromBody(body, num);
        if (grokked === undefined) continue;
        return grokked;
    }
    return;
}

/* Get an array of grokked courses from an array of course codes */
async function infoAll(codes) {
    return Promise.all(codes.map(info).filter(x => x !== undefined));
}

/* Get an array of grokked courses matching a particular search query */
async function search(query) {
    let value = searchbar.value;
    query = query || value;
    query = query.replace(" ", "");
    var dept = query.replace(new RegExp("[0-9]+"), "").toUpperCase();
    var num = query.replace(new RegExp("[A-Za-z]+"), "");
    if (dept === "") {
        dept = major;
    }
    log(`search|${major}|${dept}|${(num === "") ? "all" : num }`);
    let semesters = ["SP20", "FA19", "SP19", "FA18"];
    let ok = false;
    for (let semester of semesters) {
        let url = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&q=${num}&subject=${dept}`;
        const response = await fetch(url);
        const body = await response.json();
        if (response.ok) {
            ok = true;
            render_id = "Search";
            window.body = body;
            search_results = body.data.classes.map(c => grok(c, semester));
            render(search_results, "Search", true, false);
            break;
        }
    }
    if (!ok) {
        alert("Invalid query - please try a different search");
    }
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
function COURSE(name, row, col, details = undefined) {
    return {
        Type: "course",
        Name: name,
        Row: row,
        Col: col,
        Details: details
    };
}

function SELECT(row, col) {
    return {
        Type: "select",
        Row: row,
        Col: col
    };
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

// add a course to the schedule: cname is string, row is int
function addCourse(cname, row, focus_sem = true, details = undefined) {
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
        data.push(COURSE(cname, row, rowsize, details));
        if (focus_sem) {
            updateRecs(() => selectSem(c.Row));
        } else {
            updateRecs();
        }
    } else {
        alert("cannot add more than 6 courses per semester");
    }
}

//delete a course from the schedule: c is a Course object
function deleteCourse(c, focus_sem = true) {
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
    if (focus_sem) {
        updateRecs(() => selectSem(c.Row));
    } else {
        updateRecs();
    }
}

// grid layout helpers
// input: a course or rec tile object
// output: x or y coordinate according to object's Row/Column field
function getX(d) {
    return 75 + d.Col * grid * 1.1 + grid / 2;
}

function getY(d) {
    return 35 + d.Row * grid * 1.35 + grid / 2;
}

// when user selects a semester to add courses
async function selectSem(n) {
    log(`selectsem|${major}|${n}`);
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

// main display function
function displayCourses() {
    let data_links = [];
    let nodeMap = new Map();
    data.forEach(d => nodeMap.set(d.Name, d));
    data_edges.forEach(d =>
        data_links.push({
            "source": nodeMap.get(d.Source),
            "target": nodeMap.get(d.Destination)
        }))

    // LHS numbers
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

    // links between courses
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
    selectbtns.moveToFront();

    // add course
    var course = courses.enter().append("g")
        .attr("class", "course")
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
        .style("opacity", 0);

    course.transition()
        .style("opacity", 1)
        .duration(500);

    course.append("circle")
        .attr("id", d => `circle_${d.Name}`)
        .attr("class", "circle_class")
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
        .attr("class", "circle_class")
        .attr("stroke", "black")
        .attr("stroke-width", 0)
        .attr("fill", "white")
        .attr("data-toggle", "modal")
        .attr("data-target", "deets")
        .style("opacity", 0)
        .on("click", d => {
            // d3.selectAll(".circle_class").attr("stroke", "black");
            // d3.selectAll(".link").attr("stroke", "black").attr("marker-mid", "url(#arrowhead)");
            if (selected_course === d.Name) {
                // deselect
                if (selected_sem !== undefined) {
                    selectSem(selected_sem);
                } else {
                    render_id = "Recommended Courses";
                    recommend().then(c => render(c, "Recommended Courses", true, false));
                }
                selected_course = undefined;
            } else {
                //select
                if (d.Details === undefined) {
                    info(d.Name)
                        .then(i => preview_class(i, false, true))
                        .then(() => $("#deets").modal("show"));
                } else {
                    preview_class(d.Details, false, true);
                    $("#deets").modal("show");
                }
                // d3.select(`#circle_${d.Name}`).attr("stroke", "blue");
                // d3.selectAll(`.src_${d.Name}`).attr("stroke", "blue")
                //     .attr("marker-mid", "url(#arrowhead_selected)");
                // d3.selectAll(`.dst_${d.Name}`).attr("stroke", "blue")
                //     .attr("marker-mid", "url(#arrowhead_selected)");
                selected_course = d.Name;
                //var c = await info(d.Name);
                //render_id = "Course Info";
                //render([c], "Course Info", false, true);
            }
        });

    var selectbtn = selectbtns.enter().append("g")
        .attr("class", "sem_select")
        .on("click", d => {
            if (d.Row != selected_sem) {
                selectSem(d.Row);
            } else {
                // deselecting a semester
                selected_sem = undefined;
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

// listener for tuning recs between diversity and relevance
function tuning(limit) {
    log(`tuning|${major}|${limit}`);
    if (limitDept == limit) return;
    limitDept = limit;
    window.limitDept = limitDept;
    updateRecs(() => {
        if (selected_sem !== undefined) {
            selectSem(selected_sem);
        } else {
            recommend().then(c => render(c, "Recommended Courses", true, false));
        }
    });
}

// bulk add functionality
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
            let courses = {
                1: [],
                2: [],
                3: [],
                4: [],
                5: []
            };
            majorCourses.forEach(function (course) {
                let head = parseInt(course.match(/\d/)[0], 10);
                head = (head > 5) ? 5 : head;
                head = (head < 1) ? 1 : head;
                courses[head].push(course);
            });
            let table = d3.select("#menu");
            let thead = table.select("thead");
            let headtr = thead.select("tr");
            let maxCourse = 0;
            Object.keys(courses).forEach(function (section) {
                let th = headtr.append("th");
                let sectionText = section.toString() + "000";
                sectionText = (sectionText == "5000") ? "5000+" : sectionText;
                th.attr("scope", "col").text(sectionText);
                maxCourse = Math.max(courses[section].length, maxCourse);
            });

            let tbody = table.select("tbody");
            for (let i = 0; i < maxCourse; i++) {
                let tr = tbody.append("tr");
                Object.keys(courses).forEach(function (s) {
                    let td = tr.append("td").text(courses[s][i]);
                    td.on("click", function () {
                        let ele = d3.select(this);
                        if (ele.attr("class") == "hover" || ele.text() == "") {
                            ele.attr("class", "");
                        } else {
                            ele.attr("class", "hover");
                        }
                    })
                })
            }
        });

    d3.select("#updatecourses").on("click", function () {
        log(`bulkadd|${major}`);
        chosenCourses = [];
        d3.select("#menu").selectAll("td").each(function (_, i) {
            if (d3.select(this).attr("class") == "hover") {
                chosenCourses.push(d3.select(this).text());
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

//ALL INITIALIZATION CODE GOES HERE
function init() {
    var reqbody = {
        Major: major.toLowerCase(),
        Courses: data
    };
    var req = new Request('/core_courses/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });

    d3.select("#addCourses").node().innerHTML = `Add ${major} Courses You've Taken`;

    //generate core courses
    fetch(req)
        .then(resp => resp.json())
        .then(d => {
            data = d.Courses;
            data.forEach(d => info(d.Name).then(i => d.Details = i));
            data.forEach(c => pref.add(c.Name));
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

    //initialize course selection modal
    choosingCourses();

    //tuning settings
    d3.select("#tuning-diversity").on("click", () => tuning(true));
    d3.select("#tuning-relevance").on("click", () => tuning(false));

    //initial recommendations
    render_id = "Recommended Courses";
    recommend().then(c => render(c, "Recommended Courses", true, false));

    var fill_per_sem = 4;
    // example pathway generation listener
    // adds a lot of courses all at once before reloading the graph
    d3.select("#auto-gen").on("click", () => {
        log(`autofill|${major}`);
        for (var i = 0; i < 8; i++) {
            var c_sem = data.filter(c => c.Row === i);
            var sem_recs = data_recs.filter(d => d.Row == i);
            var rec_names = [];
            sem_recs.forEach(sr => sr.Recs.forEach(r => rec_names.push(r)));
            for (var j = 0; j < fill_per_sem - c_sem.length; j++) {
                var cname = rec_names[j];
                data.push(COURSE(cname, i, c_sem.length + j));
                pref.add(cname);
            }
            sem_select.forEach(d => {
                d.Col = fill_per_sem;
            });
        }
        updateRecs();
    });
    // d3.select("#deets").on('hidden.bs.modal', () => {
    //     alert("modal closed");
    //     d3.selectAll(".circle_class").attr("stroke", "black");
    //     d3.selectAll(".link").attr("stroke", "black").attr("marker-mid", "url(#arrowhead)");
    // });
}
//NO FUNCTIONS BELOW THIS LINE
init();

window.d3 = d3;

window.stack = stack;
window.search_results = search_results;
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
window.data = data;
window.sem_select = sem_select;
window.selected_sem = selected_sem;
window.limitDept = limitDept;
