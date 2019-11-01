package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"math/rand"
	"net/http"
	"regexp"
	"sort"
	"strconv"

	"cloud.google.com/go/logging"
	"google.golang.org/api/option"
)

type Edge struct {
	Source      string
	Destination string
	Weight      int
}

type Graph struct {
	Nodes []string
	Edges []Edge
}

type Course struct {
	Name string
	Row  int
	Col  int
}

type CourseResponse struct {
	Courses []Course
}

type CourseCodes struct {
	Codes []string
}

type AddResponse struct {
	Row int
}

type RecTile struct {
	Recs []string
	Row  int
	Col  int
}

type RecResponse struct {
	Recs []RecTile
}

type PathwaysRequest struct {
	Major   string
	Courses []Course
	Course  string
}

type LogRequest struct {
	Message string
}

func contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func containsint(s []int, e int) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func filter(vs []string, f func(string) bool) []string {
	vsf := make([]string, 0)
	for _, v := range vs {
		if f(v) {
			vsf = append(vsf, v)
		}
	}
	return vsf
}

func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}

func max(x, y int) int {
	if x < y {
		return y
	}
	return x
}

func remove(a []string, i int) []string {
	a[i] = a[len(a)-1]
	a[len(a)-1] = ""
	a = a[:len(a)-1]
	return a
}

func renderStaticTemplate(w http.ResponseWriter, tmpl string) {
	// fmt.Println(tmpl)
	t, err := template.ParseFiles("static/" + tmpl + ".html")
	if err != nil {
		fmt.Println("template load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	err = t.Execute(w, nil)
	if err != nil {
		fmt.Println("template execute error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// endpoint handler for vis (HTML response)
func visHandler(w http.ResponseWriter, r *http.Request) {
	renderStaticTemplate(w, "vis")
}

// endpoint handler for splash page (HTML response)
func splashHandler(w http.ResponseWriter, r *http.Request) {
	renderStaticTemplate(w, "index")
}

// generate up to n recommendations based on a course graph, a list of courses,
// an excluded courses map
func genRec(graph *Graph, semCourses []string, excl *map[string]bool, n int) *RecTile {
	points := make(map[string]int)
	candidates := []string{}
	// iterate thru edges and calculate scores
	for _, e := range graph.Edges {
		if contains(semCourses, e.Source) {
			_, ok := points[e.Destination]
			if !ok {
				candidates = append(candidates, e.Destination)
			}
			points[e.Destination] = points[e.Destination] + e.Weight
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
	// get top n candidates, if none exist then random course
	for i := 0; i < n; i++ {
		if i >= len(candidates) {
			randomCourse := graph.Nodes[rand.Intn(len(graph.Nodes))]
			top = append(top, randomCourse)
			(*excl)[randomCourse] = true
		} else {
			top = append(top, candidates[i])
			(*excl)[candidates[i]] = true
		}
	}
	return &RecTile{Recs: top}
}

// endpoint handler for requests for core classes (JSON response)
func coreClassesHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		// fmt.Println("request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	reqGraph, err := loadGraph(req.Major + "_req")
	if err != nil {
		// fmt.Println("graph load error")
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
		level := courseNum
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
		fmt.Println("response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

// treats list of courses as unordered, generates 10 recs for everything
func unorderedRecHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Println("request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	coGraph, err := loadGraph(req.Major + "_co")
	if err != nil {
		fmt.Println("graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	postGraph, err := loadGraph(req.Major + "_post")
	if err != nil {
		fmt.Println("graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	courses := req.Courses
	cnames := []string{}
	excl := make(map[string]bool)
	for _, c := range courses {
		excl[c.Name] = true
		cnames = append(cnames, c.Name)
	}

	recPost := genRec(postGraph, cnames, &excl, 5)
	recCo := genRec(coGraph, cnames, &excl, 5)
	recs := append(recPost.Recs, recCo.Recs...)

	response := CourseCodes{Codes: recs}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println("response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

// endpoint handler for request for new recs (JSON response)
// request format: PathwaysRequest
// response format: RecResponse
func recHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Println("request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	coGraph, err := loadGraph(req.Major + "_co")
	if err != nil {
		fmt.Println("graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	postGraph, err := loadGraph(req.Major + "_post")
	if err != nil {
		fmt.Println("graph load error")
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
	// generate semester recs from lowest to highest sem
	// TODO: should this be reversed to give more varied courses from lowest sem?
	sort.Ints(semKeys)
	// reversal code below

	// for i := len(semKeys)/2 - 1; i >= 0; i-- {
	// 	opp := len(semKeys) - 1 - i
	// 	semKeys[i], semKeys[opp] = semKeys[opp], semKeys[i]
	// }

	// calculate points and generate recs
	for _, k := range semKeys {
		// for all semesters but the last
		// generate post-enrollment recs for next semester
		if k < len(semKeys)-1 {
			postRec := genRec(postGraph, semMap[k], &excl, 3)
			postRec.Col = len(semMap[k+1])
			postRec.Row = k + 1
			recs = append(recs, *postRec)
		}
		// generate co-enrollment recs
		coRec := genRec(coGraph, semMap[k], &excl, 3)
		coRec.Col = len(semMap[k]) + 1
		coRec.Row = k
		recs = append(recs, *coRec)
		// first semester has no post-enrollment rec
		// so generate a second co-enrollment rec
		if k == 0 {
			coRec = genRec(coGraph, semMap[k], &excl, 3)
			coRec.Col = len(semMap[k])
			coRec.Row = k
			recs = append(recs, *coRec)
		}
	}
	response := RecResponse{Recs: recs}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println("response marshal error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

//return semester with fewer courses
func findSmallerSem(semMap *map[int][]string, a int, b int) int {
	if len((*semMap)[a]) > len((*semMap)[b]) {
		return b
	}
	return a
}

func addHandler(w http.ResponseWriter, r *http.Request) {
	req := PathwaysRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Println("request decode error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	coGraph, err := loadGraph(req.Major + "_co")
	if err != nil {
		fmt.Println("graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	postGraph, err := loadGraph(req.Major + "_post")
	if err != nil {
		fmt.Println("graph load error")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	addCourse := req.Course
	courses := req.Courses
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

	// calculate points and generate recs
	for _, e := range coGraph.Edges {
		for _, k := range semKeys {
			if contains(semMap[k], e.Source) && e.Destination == addCourse {
				semPoints[k] = semPoints[k] + e.Weight/len(semMap[k])
			}
		}
	}
	for _, e := range postGraph.Edges {
		for _, k := range semKeys {
			if contains(semMap[k], e.Source) && e.Destination == addCourse && containsint(semKeys, k+1) {
				semPoints[k+1] = semPoints[k+1] + e.Weight/len(semMap[k])
			}
		}
	}

	for _, e := range postGraph.Edges {
		for _, k := range semKeys {
			if contains(semMap[k], e.Destination) && e.Source == addCourse && containsint(semKeys, k-1) {
				semPoints[k-1] = semPoints[k-1] + e.Weight/len(semMap[k])
			}
		}
	}

	// get semester of maximum points
	addSem := 0
	maxWt := 0
	for k, v := range semPoints {
		if v > maxWt {
			maxWt = v
			addSem = k
		}
	}

	// if course is unrelated to current schedule,
	// place according to course number
	digits := regexp.MustCompile("[0-9]+")
	if maxWt == 0 {
		courseNum, _ := strconv.Atoi(digits.FindString(addCourse))
		if courseNum > 4000 {
			addSem = findSmallerSem(&semMap, 6, 7)
		} else if courseNum > 3000 {
			addSem = findSmallerSem(&semMap, 4, 5)
		} else if courseNum > 2000 {
			addSem = findSmallerSem(&semMap, 2, 3)
		} else {
			addSem = findSmallerSem(&semMap, 0, 1)
		}
	}

	response := AddResponse{Row: addSem}
	responseJSON, err := json.Marshal(response)
	if err != nil {
		fmt.Println("response marshal error")
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

func logHandler(w http.ResponseWriter, r *http.Request) {
	req := LogRequest{}
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		return
	}
	netid := r.Header.Get("NetID")
	if netid == "" {
		netid = "test"
	}
	msg := "log: " + netid + "|" + req.Message
	ctx := context.Background()
	projectID := "pathways-logging"

	// create logging client (for now, non-fatal error if it fails)
	client, err := logging.NewClient(ctx, projectID, option.WithCredentialsFile("pathways-logging.json"))
	if err != nil {
		fmt.Println("Failed to create client: ", err)
		return
	}
	defer client.Close()
	fmt.Println(msg)

	// log the message
	logName := "pathways-log"
	logger := client.Logger(logName).StandardLogger(logging.Info)
	logger.Println(msg)

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
	http.HandleFunc("/vis/", visHandler)
	http.HandleFunc("/rec/", recHandler)
	http.HandleFunc("/unordered_rec/", unorderedRecHandler)
	http.HandleFunc("/smart_add/", addHandler)
	http.HandleFunc("/core_courses/", coreClassesHandler)
	http.HandleFunc("/log/", logHandler)
	fmt.Println(http.ListenAndServe(":8000", nil))
}
