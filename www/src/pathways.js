var d3 = require('d3');

import 'bootstrap';

import '../style/pathways.scss';

var vis = d3.select("#vis");
var grid = 120;
var data = [];
var data_recs = [];
var data_edges = [];
var recs_per_tile = 1;

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
    var reqbody = {
        Major: major.toLowerCase(),
        Course: code,
        Courses: data,
    };

    var req = new Request('/smart_add/', {
        method: 'POST',
        body: JSON.stringify(reqbody)
    });

    fetch(req)
        .then(resp => resp.json())
        .then(d => {
            addCourse(code, d.Row);
        });
}

/* Remove a class from the list of preferred classes */
function remove(code) {
    console.log(code);
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
function render(courses, status) {
    status = status || "Courses";
    mode.innerHTML = status;

    stack = courses;
    window.stack = stack;

    //console.log(stack);

    let cards = stack.map(card);

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
        credits: course.enrollGroups[0].unitsMinimum,
        link: `https://classes.cornell.edu/browse/roster/SP20/class/${course.subject}/${course.catalogNbr}`
    }

    return trim;
}

/* Get an html card for a grokked course */
function card(course) {

    let html = `<div class='card'>
        <div class='card-header'>
            <div class='code'>${course.subject} ${course.catalogNbr}</div>
            <div class='name'><a href="${course.link}">${course.titleShort}</a></div>
            <div class='cred'>${course.credits}</div>
        </div>
        <div class="card-body">
            <p class="card-text">${course.description}</p>
            <a class="btn btn-primary btn-sm" href="${course.link}" role="button" target="_blank">Details</a>
            <button class="btn btn-success btn-sm" onclick="add('${course.subject}${course.catalogNbr}')">Select</button>
            <button class="btn btn-danger btn-sm" onclick="remove('${course.subject}${course.catalogNbr}')">Remove</button>
        </div>
    </div>`;

    return html
}


/* Get grokked course for a particular code */
async function info(code) {
    let semesters = ["FA19", "SP20"];
    let dept = code.slice(0, -4);

    for (let semester of semesters) {
        let uri = `https://classes.cornell.edu/api/2.0/search/classes.json?roster=${semester}&subject=${dept}`;

        function getCourseFromBody(body, code) {
            const num = code.slice(-4);

            for (let course of body.data.classes) {
                if (course.catalogNbr == num) {
                    return grok(course);
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
    return Promise.all(codes.map(info));
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
            search_results = data.classes.map(grok);
            render(search_results, "Search");
        });
}

/* Get an array of recommended courses based on the preferences list */
async function recommend(codes) {
    codes = codes || pref;

    var reqbody = {
        Major: major.toLowerCase(),
        Courses: data
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

function REC(suggestions, row, col) {
    return {
        Type: "rec",
        Recs: suggestions,
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
            updateRecs();
        });
}

function updateRecs() {
    console.log(data);
    var reqbody = {
        Major: major.toLowerCase(),
        Courses: data
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
        data.push(COURSE(cname, row, rowsize));
        updateRecs();
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
    data.map(x => { //shift to left
        if (x.Row == row && x.Col > col) {
            x.Col = x.Col - 1;
        }
    });
    pref.delete(c.Name);
    window.pref = pref;
    updateRecs();
}

// grid layout helpers
function getX(d) {
    return 30 + d.Col * grid * 1.1 + grid / 2;
}

function getY(d) {
    return 30 + d.Row * grid * 1.1 + grid / 2;
}

//displays the semester next to each row
// function displaySemesters() {
//     let semesters = [];
//     let currDate = new Date();
//     let currYear = currDate.getFullYear();
//     if (currDate.getMonth() < 5) {
//         currYear = currYear - 1;
//     }

//     let fallSpring = ["F","S"];
//     for (let i = 0; i < 8; i++){
//         if (i % 2 == 1) {
//             currYear = currYear + 1
//         }
//         semesters.push({
//             "Year":fallSpring[i%2] + currYear.toString(),
//             "Col":0,
//             "Row":i});
//     }

//     let visSem = vis.selectAll(".semester").data(semesters, d => d.Year);
//     visSem.attr("transform", d => `translate(${getX(d) - 15} ${getY(d)})`);
//     let sem = visSem.enter().append("g")
//         .attr("class","semester")
//         .attr("transform", d => `translate(${getX(d) - 10} ${getY(d)})`);
//     sem.append("text")
//         .attr('text-anchor', "middle")
//         .attr("font-size", "15px")
//         .text(d => d.Year)
//         .attr("x", 0)
//         .attr("y", grid * 0.5)
//         .attr("fill", "black")
//         .style("writing-mode", "vertical-rl")
//         .style("text-orientation","upright");
// }

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
    //collecting all courses and recommendations together
    let allNodes = [];
    let allEdges = [];
    for (let node of data) {
        allNodes.push({
            "Type": "Course",
            "Name": node["Name"],
            "Row": node["Row"],
            "Col": node["Col"]
        })
    }
    for (let row of data_recs) {
        for (let rec of row["Recs"]) {
            allNodes.push({
                "Type": "Rec",
                "Name": rec,
                "Row": row["Row"],
                "Col": row["Col"]
            });
        }
    }
    for (let edge of data_edges){
        allEdges.push({"source":edge["Source"],"target":edge["Destination"]})
    }
    console.log(data, data_recs);
    console.log(allNodes);
    console.log(allEdges);

    let simulation = d3.forceSimulation();

    let nodes = vis.selectAll(".node").data(allNodes);
    nodes.exit().remove();
    nodes.selectAll("circle").remove();
    nodes.selectAll("text").remove();

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

    let edges = vis.selectAll(".link").data(allEdges);
    edges.exit().remove();
    edges.selectAll("path").remove();
    let edge = edges.enter().append("path").merge(edges)
        .attr("class","link")
        .attr("stroke","black")
        .attr("marker-end", "url(#arrowhead)")
        .attr("fill","none");

    simulation.nodes(allNodes)
        .force("link", d3.forceLink()
            .links(allEdges).id(d => d.Name))
        .force("charge", d3.forceManyBody());

    nodes = nodes.enter().append("g").merge(nodes)
        .attr("class", "node")
        .attr("transform", d => `translate(${getX(d)} ${getY(d)})`);

    simulation.on("tick", function () {
        nodes
            .transition()
            .attr("transform", d => `translate(${getX(d)} ${getY(d)})`)
            .duration(500);
        
        edge.attr("d", d => 'M ' + getX(d.source) + ' ' + getY(d.source) 
            + ' L ' + getX(d.target) + ' ' + getY(d.target))
        // edge.attr("x1", d => getX(d.source))
        //     .attr("y1", d => getY(d.source))
        //     .attr("x2", d => getX(d.target))
        //     .attr("y2", d => getY(d.target));
    });
    
    for (var i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
        simulation.tick();
    }

    nodes.append("circle")
        .attr("r", grid / 2)
        .attr("fill", d => d.Type == "Course" ? "red" : "white")
        .attr("stroke", d => d.Type == "Course" ? "black" : "gray")
        .attr("stroke-dasharray", d => d.Type == "Course" ? "none" : "8 4")
        .on("click", d => d.Type == "Course" ? deleteCourse(d) : addCourse(d.Name, d.Row))
        .on("contextmenu", d =>
            d.Type == "Course" ?
            makeContextMenu(d, "COURSE") :
            makeContextMenu(d.Name, "REC", d.Row))
        .attr("stroke-width", 3);

    nodes.append("text")
        .attr('text-anchor', "middle")
        .attr("font-size", "18px")
        .text(d => d.Name)
        .attr("x", 3.5)
        .attr("y", 8)
        .attr("fill", d => d.Type == "Course" ? "white" : "gray")
        .on("click", d => d.Type == "Course" ? deleteCourse(d) : addCourse(d.Name, d.Row))
        .on("contextmenu", d =>
            d.Type == "Course" ?
            makeContextMenu(d, "COURSE") :
            makeContextMenu(d.Name, "REC", d.Row));
}

init();

get_popular().then(c => render(c, "Popular"));

d3.select("#popular").on("click", () => {
    get_popular().then(c => render(c, 'Popular'))
});

d3.select("#recommended").on("click", () => {
    recommend().then(c => render(c, 'Recommended'))
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
