package main

import (
	"encoding/json"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"sort"
)

type Edge struct {
	Source string
	Dest   string
	Weight int
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
	t, err := template.ParseFiles(tmpl + ".html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	err = t.Execute(w, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// endpoint handler for vis (HTML response)
func visHandler(w http.ResponseWriter, r *http.Request) {
	renderStaticTemplate(w, "vis")
}

// endpoint handler for splash page (HTML response)
func splashHandler(w http.ResponseWriter, r *http.Request) {
	renderStaticTemplate(w, "splash")
}

// generate up to 3 recommendations based on a course graph, a list of courses,
// an excluded courses map
func genRec(graph *Graph, semCourses []string, excl *map[string]bool) *RecTile {
	points := make(map[string]int)
	candidates := []string{}
	// iterate thru edges and calculate scores
	for _, e := range graph.Edges {
		_, ok := points[e.Dest]
		if !ok {
			candidates = append(candidates, e.Dest)
		}
		if contains(semCourses, e.Source) {
			points[e.Dest] = points[e.Dest] + e.Weight
		}
	}
	// sort candidates by points
	sort.SliceStable(candidates, func(i, j int) bool {
		return points[candidates[i]] > points[candidates[j]]
	})
	// filter out excluded candidates
	candidates = filter(candidates, func(x string) bool {
		_, ok := (*excl)[x]
		return ok
	})
	top := []string{}
	// get top 3 candidates
	for i := 0; i < 3; i++ {
		if i >= len(candidates) {
			break
		}
		top = append(top, candidates[i])
		(*excl)[candidates[i]] = true
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	coGraph, err := loadGraph(req.Major + "_co")
	postGraph, err := loadGraph(req.Major + "_post")

	courses := req.Courses
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
	}
	sort.Ints(semKeys)

	// calculate points and generate recs
	for i, k := range semKeys {
		// for all semesters but the last
		// generate post-enrollment recs for next semester
		if i < len(semKeys)-1 {
			postRec := genRec(postGraph, semMap[k], &excl)
			postRec.Col = len(semMap[k])
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseJSON)
}

// helper for loading a graph file
func loadGraph(name string) (*Graph, error) {
	filename := name + ".json"
	graph := Graph{}
	contents, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(contents, &graph)
	return &graph, nil
}

func main() {
	http.HandleFunc("/", splashHandler)
	http.HandleFunc("/vis/", visHandler)
	http.HandleFunc("/rec/", recHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
