# pathways-vis
visualization project of pathways through cornell CIS

## Journal:

### Week ending on 9/21:

#### Goals: 

- All: explore the old codebase
- All: get access to the dataset and begin investigation

#### Progress:

- All: held brainstorming meetings and presented several visualization ideas to prof kizilcec
- Danny: built data module that supports easy loading/querying of enrollment data, enabling faster EDA

### Week ending on 9/28

#### Goals: 

- continue exploratory analysis
- Eric: try to build required courses
- Danny: try to build graph of dependent courses
- Sam: explore class selections by major and other useful data sources
- set up Github repo

#### Progress:

- Danny: set up repo, created graph library for modeling dependent courses that
  supports dumping to graphviz DOT format, calculated some summary statistics on
  the graph
- Eric: used Sam's work to build a heuristic to get required courses (top 10 of # of students in class / # of students
  in major) and possible paths between them (75% of max path between 2 classes).
  Made simple viz in D3 to show results
- Built notebook with Eric to identify popular/core courses and demo an
  implementation of CoS API

### Week ending on 10/5

#### Goals: 

- Danny: tune thresholds for including classes in graph, separate graphs for
  different majors, (stretch) investigate undirected edges and dumping graph to
  JSON for displaying with D3.
- Sam: start working on ways to interpret data and make class recommendations
- Eric: update requirement graph with classes take same semester, try to get
  force graph to make a better vis that will look cleaner

#### Progress:
- Danny: support for JSON dumping and separate graphs for different majors.
  built co-enrollment graph. designed and built UI prototype with dummy data.
- Eric: read the papers, used Danny's method of getting class to class to build
  previous graphs and get classes next to each other, still need to improve viz
- Sam: built site prototype, started work on recommendations

### Week ending on 10/12

#### Goals: 
- Danny: refine UI prototype, more investigation for undirected edges and thresholding, investigate graph representation size
- Eric: improve viz for required classes, combine required classes that are
  semester to semester and same semester together to improve graph
- Sam: build a preliminary recommendation prototype, incorporate some interactivity into site

#### Progress:
- Eric: made required classes with co and next semester
- Danny: calculated graph JSON sizes, added animations to UI and began integrating real data

### Week ending on 10/19

#### Goals: 
- Eric: not sure, try to make flask backend to integrate UI viz and frontend?
- Danny: integrate real data into interactive schedule UI, connect to Sam's
  website UI
- Sam: Start building out site prototype with bootstrap and npm

