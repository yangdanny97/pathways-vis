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
- set up Github repo

#### Progress:
- Danny: set up repo, created graph library for modeling dependent courses that supports dumping to graphviz DOT format, calculated some summary statistics on the graph
- Eric: used Sam's work to build a heuristic to get required courses (top 10 of # of students in class / # of students
  in major) and possible paths between them (75% of max path between 2 classes).
  Made simple viz in D3 to show results

### Week ending on 10/5

#### Goals: 
- Danny: tune thresholds for including classes in graph, separate graphs for different majors, (stretch) investigate undirected edges and dumping graph to JSON for displaying with D3.

#### Progress:
- TBD
