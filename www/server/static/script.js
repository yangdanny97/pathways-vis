var vis = d3.select("#vis");
var grid = 100;
var data = [];
var data_recs = [];
var major = "cs"

// course and recommendation factory methods
function COURSE(name, row, col) {
    return { Type: "course", Name: name, Row: row, Col: col };
}

function REC(suggestions, row, col) {
    return { Type: "rec", Recs: suggestions, Row: row, Col: col };
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
    // TODO update the URL
    var reqbody = {Major:major, Courses:data};
    var req = new Request('http://localhost:8000/rec/', {method: 'POST', body: JSON.stringify(reqbody)});
    fetch(req)
        .then(resp => resp.json())
        .then(d => {
            data_recs = d.Recs;
            displayCourses();
        });
}

function addCourse(cname, row) {
    console.log(`ADD ${cname}`);
    var rowsize = data.filter(x => x.Row == row).length;
    if (rowsize < 6) {
        data.push(COURSE(cname, row, rowsize));
        updateRecs();
    }
}

function deleteCourse(c) {
    var row = c.Row, col = c.Col;
    console.log(`DELETE ${c.Name}`);
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
    return 25 + (7 - d.Row) * grid * 1.2;
}

function displayCourses() {
    console.log(data);
    console.log(data_recs);
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

//initial loading
init();