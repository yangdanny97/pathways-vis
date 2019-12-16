package main

import (
	"crypto/sha1"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"math/rand"
	"net/http"
	"path"
	"regexp"
	"sort"
	"strconv"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

// Edge : an edge in a course graph
// source and dest are course codes
type Edge struct {
	Source      string
	Destination string
	Weight      int
}

// Graph : course graph
type Graph struct {
	Nodes []string
	Edges []Edge
}

// Course : represents a course tile on the vis
type Course struct {
	Name string
	Row  int
	Col  int
}

// CourseResponse : list of course objects
type CourseResponse struct {
	Courses []Course
}

// CourseCodes : list of course codes
type CourseCodes struct {
	Codes []string
}

// AddResponse : format for smart-add response (which row to add it to)
type AddResponse struct {
	Row int
}

// RecTile : recommendation tile
// (the row/col structure is unused, legacy)
type RecTile struct {
	Recs []string
	Row  int
	Col  int
}

// RecResponse : response to recommendation request
// (list of recommendations + edges connecting nodes)
type RecResponse struct {
	Recs  []RecTile
	Edges []Edge
}

// PathwaysRequest : format for general recommendation requests
type PathwaysRequest struct {
	Major     string
	Courses   []Course
	Course    string
	LimitDept bool
}

type SelectPathwaysRequest struct {
	Major     string
	Courses   []Course
	Selected  []string
	LimitDept bool
}

// LogRequest : format for logging requests
type LogRequest struct {
	Message string
}

// returns if [s] contains [e]
func contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

// returns if [s] contains [e]
func containsint(s []int, e int) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

// return new list with the values of [vs] that satisfy predicate [f]
func filter(vs []string, f func(string) bool) []string {
	vsf := make([]string, 0)
	for _, v := range vs {
		if f(v) {
			vsf = append(vsf, v)
		}
	}
	return vsf
}

// min of 2 ints
func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}

// max of 2 ints
func max(x, y int) int {
	if x < y {
		return y
	}
	return x
}

// returns [a] with the element at index [i] removed
// ordering is not preserved
func remove(a []string, i int) []string {
	a[i] = a[len(a)-1]
	a[len(a)-1] = ""
	a = a[:len(a)-1]
	return a
}

// helper function for rendering static HTML
func renderStaticTemplate(w http.ResponseWriter, tmpl string) {
	t, err := template.ParseFiles("static/" + tmpl + ".html")
	if err != nil {
		fmt.Println(err)
		fmt.Println("template load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	err = t.Execute(w, nil)
	if err != nil {
		fmt.Println(err)
		fmt.Println("template execute error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// endpoint handler for main vis page (HTML response)
func visHandler(w http.ResponseWriter, r *http.Request) {
	renderStaticTemplate(w, "vis")
}

// endpoint handler for splash page (HTML response)
func splashHandler(w http.ResponseWriter, r *http.Request) {
	renderStaticTemplate(w, "index")
}

// endpoint handler for about page (HTML response)
func aboutHandler(w http.ResponseWriter, r *http.Request) {
	renderStaticTemplate(w, "about")
}

// serve list of majors
func majorHandler(w http.ResponseWriter, r *http.Request) {
	fp := path.Join("data", "majors.json")
	http.ServeFile(w, r, fp)
}

// generate up to [n] recommendations based on a course graph [graph], a list of courses [semCourses],
// and an excluded courses map [excl]
// [reverse] to reverse the edges of the graph,
// [limitDept] to limit to max 1 course recommended per department
// returns: a single RecTile representing a list of recommendations
func genRec(graph *Graph, semCourses []string, excl *map[string]bool, n int, reverse bool, limitDept bool) *RecTile {
	points := make(map[string]int)
	candidates := []string{}
	// iterate thru edges and calculate scores
	for _, e := range graph.Edges {
		if !reverse {
			if contains(semCourses, e.Source) {
				_, ok := points[e.Destination]
				if !ok {
					candidates = append(candidates, e.Destination)
				}
				points[e.Destination] = points[e.Destination] + e.Weight
			}
		} else {
			if contains(semCourses, e.Destination) {
				_, ok := points[e.Source]
				if !ok {
					candidates = append(candidates, e.Source)
				}
				points[e.Source] = points[e.Source] + e.Weight
			}
		}
	}
	// sort candidates by points
	sort.SliceStable(candidates, func(i, j int) bool {
		return points[candidates[i]] > points[candidates[j]]
	})
	// filter out excluded candidates
	candidates = filter(candidates, func(x string) bool {
		_, ok := (*excl)[x]
		return !ok
	})
	top := []string{}
	re := regexp.MustCompile(`[0-9]+`)
	// get top n candidates, if none exist then random course
	for i := 0; i < n; i++ {
		selected := ""
		if i >= len(candidates) {
			allc := filter(graph.Nodes, func(x string) bool {
				_, ok := (*excl)[x]
				return !ok
			})
			randomCourse := allc[rand.Intn(len(allc))]
			top = append(top, randomCourse)
			(*excl)[randomCourse] = true
			selected = randomCourse
		} else {
			top = append(top, candidates[i])
			(*excl)[candidates[i]] = true
			selected = candidates[i]
		}

		if limitDept {
			// make sure recommendations in same batch come from diff departments
			selectedDept := re.Split(selected, 2)[0]
			candidates = filter(candidates, func(x string) bool {
				return re.Split(x, 2)[0] != selectedDept
			})
		}
	}
	return &RecTile{Recs: top}
}

// returns JSON of list of all courses in a specific major
// used to populate bulk-add list
func majorCoursesHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	graph, err := loadGraph(req.Major + "_co")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	var majorCourses []Course
	for _, n := range graph.Nodes {
		matched, _ := regexp.MatchString(strings.ToUpper("^"+req.Major), n)
		if matched {
			majorCourses = append(majorCourses, Course{Name: n, Row: 0, Col: 0})
		}
	}
	reFull := regexp.MustCompile("[0-9]+")
	sort.SliceStable(majorCourses, func(i, j int) bool {
		courseNum1, _ := strconv.Atoi(reFull.FindString(majorCourses[i].Name))
		courseNum2, _ := strconv.Atoi(reFull.FindString(majorCourses[j].Name))
		return courseNum1 < courseNum2
	})

	response := CourseResponse{Courses: majorCourses}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println(err)
		fmt.Println("response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

// endpoint handler for requests for core classes (JSON response)
func coreClassesHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Println("core handler: request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	reqGraph, err := loadGraph(req.Major + "_req")
	if err != nil {
		fmt.Println("core handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	var courses []Course
	edges := make(map[string][]string)
	numEdges := make(map[string]int)
	levels := make(map[int][]string)
	re := regexp.MustCompile("[0-9]")
	reFull := regexp.MustCompile("[0-9]+")

	for _, n := range reqGraph.Nodes {
		numEdges[n] = 0
	}

	//iterate through all edges and find # count into each one
	for _, e := range reqGraph.Edges {
		sources, ok := edges[e.Source]
		if ok {
			edges[e.Source] = append(sources, e.Destination)
		} else {
			edges[e.Source] = []string{e.Destination}
		}

		eCount, ok := numEdges[e.Destination]
		numEdges[e.Destination] = eCount + 1
	}

	//get first level
	for n, e := range numEdges {
		courseNum, _ := strconv.Atoi(re.FindString(n))
		courseNum = courseNum - 1
		level := 0
		if courseNum <= 2 {
			level = 0
		} else {
			level = courseNum
		}
		if e == 0 {
			nodes, ok := levels[level]
			if ok {
				levels[level] = append(nodes, n)
			} else {
				levels[level] = []string{n}
			}
		}
	}

	//next levels and add courses
	classSet := make(map[string]bool)
	rowColCount := []int{0, 0, 0, 0, 0, 0, 0, 0}
	level := 0
	for level < 8 {
		nodes, _ := levels[level]
		// fmt.Println(levels)
		_, ok := levels[level+1]
		if !ok {
			levels[level+1] = []string{}
		}
		for _, node := range nodes {
			//add current courses
			_, newClass := classSet[node]
			if !newClass {
				courses = append(courses, Course{Name: node, Row: level, Col: rowColCount[level]})
				rowColCount[level] = rowColCount[level] + 1
				classSet[node] = true
			}

			//fill in next level
			nextNodes := edges[node]
			sort.SliceStable(nextNodes, func(i, j int) bool {
				courseNum1, _ := strconv.Atoi(reFull.FindString(nextNodes[i]))
				courseNum2, _ := strconv.Atoi(reFull.FindString(nextNodes[j]))
				return courseNum1 < courseNum2
			})
			for _, nextNode := range nextNodes {
				_, newClass := classSet[nextNode]
				if !newClass && len(levels[level+1]) < 2 {
					levels[level+1] = append(levels[level+1], nextNode)
					classSet[node] = true
				} else if !newClass && len(levels[level+1]) >= 2 {
					nextLevel := min(7, level+2)
					levels[nextLevel] = append(levels[nextLevel], nextNode)
					classSet[node] = true
				}
			}
		}
		level = level + 1
	}

	response := CourseResponse{Courses: courses}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println(err)
		fmt.Println("core handler: response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

// treats list of courses sent in requests as unordered,
// generates 10 recs for everything
func unorderedRecHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Println(err)
		fmt.Println("unordered rec handler: request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	coGraph, err := loadGraph(req.Major + "_co")
	if err != nil {
		fmt.Println(err)
		fmt.Println("unordered rec handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	postGraph, err := loadGraph(req.Major + "_post")
	if err != nil {
		fmt.Println(err)
		fmt.Println("unordered rec handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	courses := req.Courses
	cnames := []string{}
	excl := make(map[string]bool)
	for _, c := range courses {
		excl[c.Name] = true
		cnames = append(cnames, c.Name)
	}

	recPost := genRec(postGraph, cnames, &excl, 4, false, req.LimitDept)
	recCo := genRec(coGraph, cnames, &excl, 4, false, req.LimitDept)
	recs := append(recPost.Recs, recCo.Recs...)

	response := CourseCodes{Codes: recs}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println(err)
		fmt.Println("unordered rec handler: response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

// return list of post-enrollment edges between courses
// inputs: course graph, map of semester # -> courses
func edgeGenerator(graph *Graph, semMap map[int][]string) []Edge {
	cMap := make(map[string]int) //map from course -> semester
	preEdge := make(map[string]Edge)
	postEdge := make(map[string]Edge)

	for n, v := range semMap {
		for _, c := range v {
			cMap[c] = n
		}
	}

	for _, e := range graph.Edges {
		srcSem, ok := cMap[e.Source]
		dstSem, ok2 := cMap[e.Destination]
		if ok && ok2 && (srcSem-dstSem == -1) {
			pre, ok := preEdge[e.Source]
			if !ok || pre.Weight < e.Weight {
				preEdge[e.Source] = e
			}
			post, ok := postEdge[e.Destination]
			if !ok || post.Weight < e.Weight {
				postEdge[e.Destination] = e
			}
		}
	}
	edges := []Edge{}
	for _, e := range preEdge {
		edges = append(edges, e)
	}
	for _, e := range postEdge {
		edges = append(edges, e)
	}
	return edges
}

// endpoint handler for request for new recs (JSON response)
// request format: PathwaysRequest
// response format: RecResponse
func recHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Println(err)
		fmt.Println("rec handler: request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	coGraph, err := loadGraph(req.Major + "_co")
	if err != nil {
		fmt.Println(err)
		fmt.Println("rec handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	postGraph, err := loadGraph(req.Major + "_post")
	if err != nil {
		fmt.Println(err)
		fmt.Println("rec handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	courses := req.Courses
	cnames := []string{}
	excl := make(map[string]bool)
	semMap := make(map[int][]string)
	semKeys := []int{}

	var recs []RecTile
	// build semester -> courses mapping, build excluded courses set
	for _, c := range courses {
		_, ok := semMap[c.Row]
		if !ok {
			semKeys = append(semKeys, c.Row)
		}
		semMap[c.Row] = append(semMap[c.Row], c.Name)
		excl[c.Name] = true
		cnames = append(cnames, c.Name)
	}
	for i := 0; i < 8; i++ {
		_, ok := semMap[i]
		if !ok {
			semKeys = append(semKeys, i)
			semMap[i] = []string{}
		}
	}

	// fmt.Println(excl)

	sort.Ints(semKeys)

	// calculate points and generate recs
	for _, k := range semKeys {
		// get post-enrollment recs if they exist
		if k > 0 {
			postRec := genRec(postGraph, semMap[k-1], &excl, 3, false, req.LimitDept)
			postRec.Col = len(semMap[k])
			postRec.Row = k
			recs = append(recs, *postRec)
		}

		// get pre-enrollment recs if they exist
		if k < len(semKeys)-1 {
			preRec := genRec(postGraph, semMap[k+1], &excl, 1, true, req.LimitDept)
			preRec.Col = len(semMap[k])
			preRec.Row = k
			recs = append(recs, *preRec)
		}

		// generate co-enrollment recs
		coRec := genRec(coGraph, semMap[k], &excl, 3, false, req.LimitDept)
		coRec.Col = len(semMap[k])
		coRec.Row = k
		recs = append(recs, *coRec)
	}
	visEdges := edgeGenerator(postGraph, semMap)
	response := RecResponse{Recs: recs, Edges: visEdges}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println("rec handler: response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(responseJSON)
}

//return semester with fewer courses (prioritizing the first argument on ties)
func findSmallerSem(semMap *map[int][]string, a int, b int) int {
	if len((*semMap)[a]) > len((*semMap)[b]) {
		return b
	}
	return a
}

//return semester with fewest courses (prioritizing the first argument on ties)
func findSmallestSem(semMap *map[int][]string, a int, b int, c int) int {
	return findSmallerSem(semMap, a, findSmallerSem(semMap, b, c))
}

// find semester to add [course] based on the currently selected [courses]
// and the co-enrollment/post-enrollment graphs
func findSemester(courses []Course, coGraph *Graph, postGraph *Graph, course string) int {
	cnames := []string{}
	semMap := make(map[int][]string)
	semKeys := []int{}
	semPoints := make(map[int]int)

	// build semester -> courses mapping, build excluded courses set
	for _, c := range courses {
		_, ok := semMap[c.Row]
		if !ok {
			semKeys = append(semKeys, c.Row)
		}
		semMap[c.Row] = append(semMap[c.Row], c.Name)
		cnames = append(cnames, c.Name)
	}
	for i := 0; i < 8; i++ {
		_, ok := semMap[i]
		if !ok {
			semKeys = append(semKeys, i)
			semMap[i] = []string{}
		}
	}
	// build semester -> courses mapping, build excluded courses set
	for _, c := range courses {
		_, ok := semMap[c.Row]
		if !ok {
			semKeys = append(semKeys, c.Row)
		}
		semMap[c.Row] = append(semMap[c.Row], c.Name)
		cnames = append(cnames, c.Name)
	}
	for i := 0; i < 8; i++ {
		_, ok := semMap[i]
		if !ok {
			semKeys = append(semKeys, i)
			semMap[i] = []string{}
		}
	}

	// calculate points and generate recs
	for _, e := range coGraph.Edges {
		for _, k := range semKeys {
			if contains(semMap[k], e.Source) && e.Destination == course {
				semPoints[k] = semPoints[k] + e.Weight ^ 2 // /len(semMap[k])
			}
		}
	}

	for _, e := range postGraph.Edges {
		for _, k := range semKeys {
			if contains(semMap[k], e.Source) && e.Destination == course && containsint(semKeys, k+1) {
				semPoints[k+1] = semPoints[k+1] + e.Weight ^ 2 // /len(semMap[k]) //max(len(semMap[k+1]), 1)
			}
			if contains(semMap[k], e.Destination) && e.Source == course && containsint(semKeys, k-1) {
				semPoints[k-1] = semPoints[k-1] + e.Weight ^ 2 // /len(semMap[k]) //max(len(semMap[k+1]), 1)
			}
		}
	}

	// get semester of maximum points
	addSem := 0
	maxWt := 0
	for k, v := range semPoints {
		if v > maxWt && len(semMap[k]) < 6 {
			maxWt = v
			addSem = k
		}
	}

	// if course is unrelated to current schedule,
	// place according to course number
	digits := regexp.MustCompile("[0-9]+")
	if maxWt == 0 {
		courseNum, _ := strconv.Atoi(digits.FindString(course))
		if courseNum > 4000 {
			addSem = findSmallestSem(&semMap, 5, 6, 7)
		} else if courseNum > 3000 {
			addSem = findSmallestSem(&semMap, 3, 4, 5)
		} else if courseNum > 2000 {
			addSem = findSmallestSem(&semMap, 1, 2, 3)
		} else {
			addSem = findSmallerSem(&semMap, 0, 1)
		}
	}
	return addSem
}

// response handler for multi-smart-add (placement for bulk-added courses)
func addMultipleHandler(w http.ResponseWriter, r *http.Request) {
	req := SelectPathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Println(err)
		fmt.Println("multiadd handler: request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	coGraph, err := loadGraph(req.Major + "_co")
	if err != nil {
		fmt.Println(err)
		fmt.Println("multiadd handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	postGraph, err := loadGraph(req.Major + "_post")
	if err != nil {
		fmt.Println(err)
		fmt.Println("multiadd handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	addCourses := req.Selected
	reFull := regexp.MustCompile("[0-9]+")
	sort.SliceStable(addCourses, func(i, j int) bool {
		courseNum1, _ := strconv.Atoi(reFull.FindString(addCourses[i]))
		courseNum2, _ := strconv.Atoi(reFull.FindString(addCourses[j]))
		return courseNum1 < courseNum2
	})
	// courses := req.Courses
	finalCourses := []Course{}

	rowColCount := []int{0, 0, 0, 0, 0, 0, 0, 0}
	for _, addCourse := range addCourses {
		row := findSemester(finalCourses, coGraph, postGraph, addCourse)
		col := rowColCount[row]
		rowColCount[row] = rowColCount[row] + 1
		finalCourses = append(finalCourses, Course{Name: addCourse, Row: row, Col: col})
	}

	response := CourseResponse{Courses: finalCourses}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println(err)
		fmt.Println("response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

// handler for smart-add
func addHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Println(err)
		fmt.Println("add handler: request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	coGraph, err := loadGraph(req.Major + "_co")
	if err != nil {
		fmt.Println(err)
		fmt.Println("add handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	postGraph, err := loadGraph(req.Major + "_post")
	if err != nil {
		fmt.Println(err)
		fmt.Println("add handler: graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	addCourse := req.Course
	courses := req.Courses
	addSem := findSemester(courses, coGraph, postGraph, addCourse)

	response := AddResponse{Row: addSem}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println(err)
		fmt.Println("add handler: response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

// helper for loading a graph file
func loadGraph(name string) (*Graph, error) {
	filename := "data/" + name + ".json"
	graph := Graph{}
	contents, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(contents, &graph)
	return &graph, nil
}

// handler for logging requests
func logHandler(w http.ResponseWriter, r *http.Request) {
	req := LogRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		return
	}
	netid := r.Header.Get("NetID")
	if netid == "" {
		// testing locally
		netid = "test"
	} else {
		// in production, hash the NetID
		h := sha1.New()
		h.Write([]byte(netid))
		netid = hex.EncodeToString([]byte(netid))
	}
	msg := "log: " + netid + "|" + req.Message
	database, err := sql.Open("sqlite3", "logging/pathways_logging.db")
	if err != nil {
		fmt.Println(err)
		fmt.Println("logging DB open error")
		return
	}
	statement, err := database.Prepare("INSERT INTO logs (user, log) VALUES (?, ?)")
	if err != nil {
		fmt.Println(err)
		fmt.Println("logging prepare error")
		return
	}
	_, err = statement.Exec(netid, req.Message)
	if err != nil {
		fmt.Println(err)
		fmt.Println("logging execute error")
	}
	fmt.Println(msg)

	// empty response (placeholder)
	response := RecResponse{}
	responseJSON, _ := json.Marshal(response)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

func main() {
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/", splashHandler)
	http.HandleFunc("/about/", aboutHandler)
	http.HandleFunc("/vis/", visHandler)
	http.HandleFunc("/rec/", recHandler)
	http.HandleFunc("/unordered_rec/", unorderedRecHandler)
	http.HandleFunc("/smart_add/", addHandler)
	http.HandleFunc("/multiple_smart_add/", addMultipleHandler)
	http.HandleFunc("/core_courses/", coreClassesHandler)
	http.HandleFunc("/major_courses/", majorCoursesHandler)
	http.HandleFunc("/log/", logHandler)
	http.HandleFunc("/majors/", majorHandler)
	fmt.Println(http.ListenAndServe(":8000", nil))
}
