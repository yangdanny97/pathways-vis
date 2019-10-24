package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"math/rand"
	"net/http"
	"sort"
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

type RecTile struct {
	Recs []string
	Row  int
	Col  int
}

type RecResponse struct {
	Recs []RecTile
}

type RecRequest struct {
	Major   string
	Courses []Course
}

func contains(s []string, e string) bool {
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

func renderStaticTemplate(w http.ResponseWriter, tmpl string) {
	fmt.Println(tmpl)
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

// generate up to 3 recommendations based on a course graph, a list of courses,
// an excluded courses map
func genRec(graph *Graph, semCourses []string, excl *map[string]bool) *RecTile {
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
	// get top 3 candidates, if none exist then random course
	for i := 0; i < 3; i++ {
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

// endpoint handler for request for new recs (JSON response)
// request format: RecRequest
// response format: RecResponse
func recHandler(w http.ResponseWriter, r *http.Request) {
	req := RecRequest{}
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
	sort.Ints(semKeys)

	// calculate points and generate recs
	for i, k := range semKeys {
		// for all semesters but the last
		// generate post-enrollment recs for next semester
		if i < len(semKeys)-1 {
			postRec := genRec(postGraph, semMap[k], &excl)
			postRec.Col = len(semMap[k+1])
			postRec.Row = k + 1
			recs = append(recs, *postRec)
		}
		// generate co-enrollment recs
		coRec := genRec(coGraph, semMap[k], &excl)
		coRec.Col = len(semMap[k]) + 1
		coRec.Row = k
		recs = append(recs, *coRec)
		// first semester has no post-enrollment rec
		// so generate a second co-enrollment rec
		if i == 0 {
			coRec = genRec(coGraph, semMap[k], &excl)
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

func main() {
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/", splashHandler)
	http.HandleFunc("/vis/", visHandler)
	http.HandleFunc("/rec/", recHandler)
	fmt.Println(http.ListenAndServe(":8000", nil))
}
