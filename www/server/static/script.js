var vis = d3.select("#vis");
var grid = 100;
var data = [];
var data_recs = [];
// var counter = 0;
// var coenroll, postenroll;

// helper for unique sorting
function distinct(val, idx, arr) {
    return arr.indexOf(val) === idx;
}

// course and recommendation factory methods
function COURSE(name, row, col) {
    return { type: "course", name: name, row: row, col: col };
}

function REC(suggestions, row, col) {
    return { type: "rec", recs: suggestions, row: row, col: col };
}

// function exclude() {
//     var coursenames = data.map(d => d.name);
//     // var recnames = [];
//     var recnames = data_recs.map(d => d.recs).flat();
//     return coursenames + recnames;
// }

// // recalculate a rec object
// // need to enforce uniqueness
// function recalculate(graph, rel_courses) {
//     if (rel_courses.length == 0) {
//         var latest_sem = data.sort((a,b) => b.row - a.row)[0].row;
//         rel_courses = data
//         .filter(d => d.row == latest_sem || d.row == latest_sem - 1)
//         .map(d => d.name);
//     }
//     var coursenames = exclude();
//     var edges = graph.edges
//         .filter(e => rel_courses.includes(e.source))
//         .filter(e => !coursenames.includes(e.destination));
//     var scores = {}
//     edges.forEach(e => {
//         if (!scores.hasOwnProperty(e.destination)) {
//             scores[e.destination] = 0;
//         }
//         scores[e.destination] = scores[e.destination] + e.weight;
//     });
//     var sorted_scores = [];
//     for (var s in scores) {
//         sorted_scores.push([s, scores[s]]);
//     }
//     sorted_scores.sort((a, b) => b[1] - a[1]);
//     return sorted_scores.slice(0, 3).map(d => d[0]);
// }

function init() {
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

    var reqbody = {Major:"cs", Courses:data};
    console.log(JSON.stringify(reqbody));

    var req = new Request('http://localhost:8000/rec/', {method: 'POST', body: JSON.stringify(reqbody)});
    fetch(req).then(resp => {
        console.log(resp.status);
        console.log(resp.json());
    });

    // for (var i = 0; i < 8; i++) {
    //     var courses = data.filter(d => d.row == i).map(c => c.name);
    //     var c_past = data.filter(d => d.row == i - 1).map(c => c.name);
    //     var num = courses.length;
    //     for (var j = 0; j < 2; j++) {
    //         var rec = REC([], i, num + j);
    //         if (j == 1) {
    //             rec.recs = recalculate(coenroll, courses);
    //         } else {
    //             rec.recs = recalculate(postenroll, c_past.length == 0 ? courses : c_past);
    //         }
    //         data_recs.push(rec);
    //     }
    // }
    // console.log(data);
    // console.log(data_recs);
}

function addCourse(cname, row) {
    console.log(`ADD ${cname}`);
    var rowsize = data.filter(x => x.row == row).length;
    if (rowsize < 6) {
        data.push(COURSE(cname, row, rowsize));
        var c_this = data.filter(c => c.row == row).map(c => c.name);
        var c_next = data.filter(c => c.row == row + 1).map(c => c.name);
        // data_recs.map(x => {
        //     //shift to right
        //     if (x.row == row) {
        //         x.col = x.col + 1;
        //     }
        // });
        // data_recs.map(x => {
        //     // recalculate current and next semester suggestions
        //     if (x.row == row) {
        //         x.recs = [];
        //         x.recs = recalculate(coenroll, c_this);
        //     } else if (x.row == row + 1) {
        //         x.recs = [];
        //         x.recs = recalculate(postenroll, c_next.length == 0 ? c_this : c_next);
        //     }
        // });
        displayCourses();
    }
}

function deleteCourse(c) {
    var row = c.row, col = c.col;
    console.log(`DELETE ${c.name}`);
    data = data.filter(x => x.name != c.name); // remove
    data.map(x => { //shift to left
        if (x.row == row && x.col > col) {
            x.col = x.col - 1;
        }
    });
    var c_this = data.filter(d => d.row == row).map(d => d.name);
    var c_next = data.filter(d => d.row == row + 1).map(d => d.name);
    // data_recs.map(x => {
    //     //shift to right
    //     if (x.row == row) {
    //         x.col = x.col - 1;
    //     }
    // });
    // data_recs.map(x => {
    //     // recalculate current and next semester suggestions
    //     if (x.row == row) {
    //         x.recs = [];
    //         x.recs = recalculate(coenroll, c_this);
    //     } else if (x.row == row + 1) {
    //         x.recs = [];
    //         x.recs = recalculate(postenroll, c_next.length == 0 ? c_this : c_next);
    //     }
    // });
    displayCourses();
}

// grid layout helpers
function getX(d) {
    return 25 + d.col * grid * 1.2;
}

function getY(d) {
    return 25 + (7 - d.row) * grid * 1.2;
}

function displayCourses() {
    var courses = vis.selectAll(".course").data(data, d => d.name);
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
            .attr("y", d => d.recs.length > i ? grid / 3 * i : -1000)
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .attr("fill", "gray")
            .on("click", d => addCourse(d.recs[i], d.row));

        recs.append("text")
            .attr('text-anchor', "middle")
            .attr("font-size", "15px")
            .text(d => d.recs[i])
            .attr("x", grid * 0.5)
            .attr("y", d => d.recs.length > i ? grid / 3 * i + 20 : -1000)
            .attr("fill", "white")
            .on("click", d => addCourse(d.recs[i], d.row));
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
        .text(d => d.name)
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
            .attr("y", d => d.recs.length > i ? grid / 3 * i : -1000)
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .attr("fill", "gray")
            .on("click", d => addCourse(d.recs[i], d.row));

        rec.append("text")
            .attr('text-anchor', "middle")
            .attr("font-size", "15px")
            .text(d => d.recs[i])
            .attr("x", grid * 0.5)
            .attr("y", d => d.recs.length > i ? grid / 3 * i + 20 : -1000)
            .attr("fill", "white")
            .on("click", d => addCourse(d.recs[i], d.row));
    }
}

//initial loading
init();
// d3.json('data/cs_co.json').then((co) => {
//     coenroll = co;
//     d3.json('data/cs_post.json').then((post) => {
//         postenroll = post;
//         init();
//         displayCourses();
//     });
// });