# pathways-vis
visualization project of pathways through cornell CIS

## Journal:

### Week ending on 9/21:

#### Goals: 

- All: explore the old codebase
- All: get access to the dataset and begin investigation

#### Progress:

- All: held brainstorming meetings and presented several visualization ideas to
  prof kizilcec
- Danny: built data module that supports easy loading/querying of enrollment
  data, enabling faster EDA

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
- Danny: refine UI prototype, more investigation for undirected edges and
  thresholding, investigate graph representation size
- Eric: improve viz for required classes, combine required classes that are
  semester to semester and same semester together to improve graph
- Sam: build a preliminary recommendation prototype, incorporate some
  interactivity into site

#### Progress:
- Eric: made required classes with co and next semester
- Danny: calculated graph JSON sizes, added animations to UI and began
  integrating real data

### Week ending on 10/19

#### Goals: 
- Eric: help with backend, develop core_courses endpoint
- Danny: integrate real data into interactive schedule UI, connect to Sam's
  website UI
- Sam: Start building out site prototype with bootstrap and npm

### Progress:
- Danny: integrated CS course data with UI for demo, with really simple
  recommendation metric
- Eric: building json of required courses
- Sam: Built interactive site model using search API and bootstrap

### Week ending on 10/26

#### Goals:
- All: build off of current prototypes for a minimum viable product, aiming for
  completion on approx 11/1
- Eric: build major courses in golang
- Danny: start working on GoLang server, figure out how to integrate that with
  UI; additionally, build out a static version which uses all 3 datasets
- Sam: Improve and streamline UX around interaction modes, aim to improve major
  selection experience

#### Progress:
- Demoed @ Kizilcec lab meeting, got feedback on priorities for next week
- Integrated frontend with server, integrated codebase for search/landing page with interactive tiles

### Week ending 11/2

#### Goals:
1. UI on the RHS: add timeline indicator and clear design for what is a selection vs. recommendation
2. implement adding/removing of courses to appear on RHS
3. ensure some degree of serendipity for finding out of major courses in uncommon departments, i..e. don’t overemphasize common courses
4. netid login
5. user interaction logging using netid as the identifier

#### Progress:
1. Several UI improvements are made
2. Done
3. No progress
4. Server is deployed on pathway.cis.cornell.edu with NetID login enabled
5. NetID + add/delete/search is logged to Google Stackdriver

### Week ending 11/9

#### Goals:
- improving the interface, reducing errors and unexpected behaviors
- add hashing for logging netIDs
- refine algorithm to promote less common courses
- investigate new/improved vis

#### Progress:
- TBD
