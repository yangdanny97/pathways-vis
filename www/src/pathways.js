var d3 = require('d3');
var $ = require('jquery');

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

// LIMIT SAME DEPARTMENT COURSE SUGGESTIONS
var limitDept = d3.select("input[name='tuning']:checked").node().value == "diversity";

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
                addCourse(code, d.Row, false);
            });
    } else {
        addCourse(code, selected_sem);
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
function grok(course, semester) {
    let trim = {
        subject: course.subject,
        catalogNbr: course.catalogNbr,
        titleLong: course.titleLong,
        titleShort: course.titleShort,
        description: course.description,
        link: `https://classes.cornell.edu/browse/roster/${semester}/class/${course.subject}/${course.catalogNbr}`,
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
    return html;
}


/* Get grokked course for a particular code */
async function info(code) {
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
function addCourse(cname, row, focus_sem = true) {
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
function getX(d) {
    return 50 + d.Col * grid * 1.1 + grid / 2;
}

function getY(d) {
    return 30 + d.Row * grid * 1.25 + grid / 2;
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
    resort();
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
            d3.select(`#circle_${d.Name}`).attr("stroke", "black");
            d3.selectAll(".link").attr("stroke", "black").attr("marker-mid", "url(#arrowhead)");
            if (selected_course === d.Name) {
                if (selected_sem !== undefined && selected_sem != -1) {
                    selectSem(selected_sem);
                } else {
                    render_id = "Recommended Courses";
                    recommend().then(c => render(c, "Recommended Courses", true, false));
                }
                selected_course = undefined;
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

// listener for tuning recs between diversity and relevance
function tuning(limit) {
    log(`tuning|${major}|${limit}`);
    if (limitDept == limit) return;
    limitDept = limit;
    window.limitDept = limitDept;
    updateRecs(() => {
        if (selected_sem !== -1 && selected_sem !== undefined) {
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
            let courses = {1:[],2:[],3:[],4:[],5:[]};
            majorCourses.forEach(function (course) {
                let head = parseInt(course.match(/\d/)[0],10);
                head = (head > 5) ? 5 : head;
                head = (head < 1) ? 1 : head;
                courses[head].push(course);
            });
            let table = d3.select("#menu");
            let thead = table.select("thead");
            let headtr = thead.select("tr");
            let maxCourse = 0;
            Object.keys(courses).forEach(function(section) {
                let th = headtr.append("th");
                let sectionText = section.toString() + "000";
                sectionText = (sectionText == "5000") ? "5000+" : sectionText;
                th.attr("scope", "col").text(sectionText);
                maxCourse = Math.max(courses[section].length, maxCourse);
            });

            let tbody = table.select("tbody");
            for (let i = 0; i < maxCourse; i++){
                let tr = tbody.append("tr");
                Object.keys(courses).forEach(function(s){
                    let td = tr.append("td").text(courses[s][i]);
                    td.on("click", function(){
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

function resort(){
    let edgeCount = {};
    let nodeMap = {};
    data.forEach(d => {
        edgeCount[d.Name] =  {"Row":d.Row,"Out":0, "In":0,"Outedges":[],"Inedges":[]};
        nodeMap[d.Name] = {};
    });

    let edgeSet = new Set();
    data_edges.forEach(d =>{
        let check = d.Source + d.Destination + d.Weight;
        if (!edgeSet.has(check)){
            edgeCount[d.Source]["Out"] += 1;
            edgeCount[d.Source]["Outedges"].push(d.Destination);
            edgeCount[d.Destination]["In"] += 1;
            edgeCount[d.Destination]["Inedges"].push(d.Source);
        }
        edgeSet.add(check);
    });

    let rowEdgeCount = {0:[],1:[],2:[],3:[],4:[],5:[],6:[],7:[]};
    Object.keys(edgeCount).forEach(node => {
        let value = edgeCount[node];
        value["Name"] = node;
        value["Diff"] = value.Out - value.In;
        let newNode = {"Diff":value.Out-value.In,"Inedges":value.Inedges,"Outedges":value.Outedges};
        rowEdgeCount[value.Row].push(value);
        nodeMap[node] = newNode;
    })
    
    let numSems = 8;
    //sort first row: first sort by out edges, then move first ele to back
    let row1 = rowEdgeCount[0]
    row1 = row1.sort(function(a,b){
        if(a.Out == b.Out){
            //get children in edges
            let aChild = a.Outedges[0];
            let bChild = b.Outedges[0];
            return aChild.In - bChild.In;
        }
        return a.Out - b.Out;
    });
    rowEdgeCount[0] = row1;

    //sorting each row iteratively
    for(var i = 1; i < numSems; i += 1){
        //sort by in edges
        let row2 = rowEdgeCount[i];
        row2.sort(function(a,b){
            if (a.In == b.In && a.Outedges.length > 0 && b.Outedges.length > 0){
                //get children in edges
                let aChild = a.Outedges[0];
                let bChild = b.Outedges[0];
                return aChild.In - bChild.In;
            }
            return a.In - b.In;
        });
        //match nodes to as close as to parent as can
        let prevRow = rowEdgeCount[i-1];
        let currRow = rowEdgeCount[i];
        //sort row by inedges
        currRow.sort(function(a,b){
            if (a.In == 0){
                return -1;
            } else {
                if (a.In == b.In && a.Outedges.length > 0 && b.Outedges.length > 0){
                    //get children in edges
                    let aChild = a.Outedges[0];
                    let bChild = b.Outedges[0];
                    return aChild.In - bChild.In;
                }
                return a.In - b.In;
            }
        });

        let updatedRow = [];
        for (let size = 0; size < 4; size++) updatedRow.push({"Name":""});
        let nodeIdx = 0;
        //iterate through every node in currRow
        while (nodeIdx < currRow.length){
            let node = currRow[nodeIdx];
            node.Inedges.sort(function(parent1,parent2){
                return parent1.Out - parent2.Out;
            });
            let parent = node.Inedges[0];
            let parentIdx = 0;
            for (let j = 0; j < prevRow.length; j++){
                let parentNode = prevRow[j];
                if (parentNode.Name == parent){
                    parentIdx = j;
                    break;
                }
            }

            //check if idx is already populated
            function check(row, idx, node){
                return row[idx].Name != "" ? false : true; 
            }

            let downIdx = parentIdx;
            let upIdx = parentIdx;
            while (true) {
                if (check(updatedRow, downIdx, node)){
                    updatedRow[downIdx] = node;
                    break;
                } else {
                    downIdx = Math.max(0, downIdx - 1);
                }
                if (check(updatedRow, upIdx, node)){
                    updatedRow[upIdx] = node;
                    break;
                } else {
                    upIdx = Math.min(3, upIdx + 1);
                }
            }
            nodeIdx++;
        }
        rowEdgeCount[i] = updatedRow;
    }
    
    data = [];
    for (let row = 0; row < numSems; row++){
        let nodes = rowEdgeCount[row];
        let col = 0;
        for (let idx in nodes){
            let node = nodes[idx];
            if (node.Name != ""){
                data.push({"Name":node["Name"], "Row":row, "Col":col});
                col += 1;
            }
        }
    }
}

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

    //generate core courses
    fetch(req)
        .then(resp => resp.json())
        .then(d => {
            data = d.Courses;
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
    //course selection modal
    choosingCourses();

    //tuning settings
    d3.select("#tuning-diversity").on("click", () => tuning(true));
    d3.select("#tuning-relevance").on("click", () => tuning(false));

    //initial recommendations
    render_id = "Recommended Courses";
    recommend().then(c => render(c, "Recommended Courses", true, false));
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
