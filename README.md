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
1. UI on the RHS: add timeline indicator and clear design for what is a
   selection vs. recommendation
2. implement adding/removing of courses to appear on RHS
3. ensure some degree of serendipity for finding out of major courses in
   uncommon departments, i.. don’t overemphasize common courses
4. netid login
5. user interaction logging using netid as the identifier

#### Progress:
1. Several UI improvements are made
   - Eric: updated algo for core courses, tried adding semester text and added
     right click context menu
   - Sam: Navbar added
   - Sam: Implemented major selection dropdown
2. Done - Danny
3. No progress
4. Server is deployed on pathway.cis.cornell.edu with NetID login enabled - Danny
5. NetID + add/delete/search is logged to Google Stackdriver - Danny

- Sam: Integrated server endpoints for popular and recommended classes

### Week ending 11/9

#### Goals:
- improving the interface, reducing errors and unexpected behaviors
- add hashing for logging netIDs (Quick fix)
- refine algorithm to promote less common courses
- investigate new/improved vis
- improve search behavior
- Sam:
  - add popovers for class info
  - make class links open in new tab
  - Add about page
  - Make the splash page look more like Bing
  - Add explanatory text to splash page
  - Improve display of major code

#### Meeting With Professor 11/4/19
- Improve splash page 
  - put pathways logo at top and make it an actual logo
  - change drop down to text entry for when we get more majors
  - Add explanatory text
  - potentially scrape all HREF from the cornell fields of study website
  - Add "pathway is a research project, click here to learn more about it" aka about page
- Improve vis page
  - Figure out intuitive design for viz that's independent of left side
  - Figure out how to represent time (arrow)
  - When clicking on viz nodes, add exploratory card to the left side
  - Add popovers for class info

#### Meeting 8 November
- Sample schedule button
  - Build a pre-filled schedule for a whole career
- Show suggestions from each course or for all courses?
- Create 1d list of courses by randomizing order of courses in each semester
  - Eliminates co- vs. post- take
  - Get a normalized positional score to place nodes in a graph
  - Get relational positions before aggregating
  - Use relations to add nodes into graph
- Enable serendipity
- Use Cases
  - Freshman: Choosing a major
  - Junior: CS major choosing courses
  - Senior: Looking for fun/interesting courses
- User interviews

#### Progress:
- hashing for NetIDs - Danny
- modify server endpoint to return directed edges - Danny
- make new mockup of "selected semester" system - Danny
- updated to force graph viz - Eric
- added directed edges to viz - Eric

### Week ending 11/16

#### Goals
- get "average semester" data
- prefilled schedule button
- display edges between nodes, label each row, add large arrow to show time
- merge semester-select and FD layout branches to main branch
- build out unordered reccommendation flow
- modes for "graph/unordered", "relevance/random" courses

#### Progress
- prefilled schedule button
- edges between courses + semester select workflow merged with main branch
- hover tooltips
- quick-fill schedule using dropdown menu

#### Midterm Presentations Feedback 11/15
- hoverover -> change circle text to "Remove" (done)
- reorder nodes to reduce edge overlap
- transparency over "how" for recs, give users more control over results (bias diversity vs relevance)
- maybe use shading to show differences between semesters

### Week ending 11/23

#### Goals
- Danny - tasks backlog, performance improvements and bug fixes
- Danny - toggling between diversity and relevance
- Eric - investigate algs to reorder nodes to reduce edge overlap

#### Progress
- data extraction script (raw CSV -> graph JSON, easily configurable) - Danny
- toggling between diversity and relevance - Danny
- added about page - Sam

### Week ending 12/7

### Goals:
- continue working on tasks backlog
- implement changes based on feedback
- prepare final presentation (slides, writeup, poster)

#### Feedback from Prof. Kizilcec
- Improve how the header bar looks: remove the red color, just show the Pathway logo top left
move the selected major down into the page body, add a label that says "XXX Major Pathway" and allow students to select a different one
- the search bar should be at the top of the list of courses I think
- rename "Auto-fill Schedule" with something that better describes what it does (Show an Example Pathway), same for "Add - Classes" (i wondered why it is only CS classes, also it is a very long list to navigate)
- Add a small (info) symbol next to the Course Recommendation type that has a hover-explanation of what it means to prioritize diversity and major-relevance - Danny
- ~Change Group to Semester and put the numbers 1 to 8 on the left hand side. I know it's not exact, but it is way more intuitive.~ - Danny
- Change the hover effect for courses (that shows course info) to a click-based effect. If you click a class circle, it will show the info on the left and let you remove it using the red button, be sure to highlight the selected class on the right hand side (maybe change the circle border color to blue. Can you also highlight the arrows that are connected to that node? - Danny
- ~The dashed circle text should say something more descriptive than "click to select", maybe "Add course" or "Course Recommendations"~ - Danny
- The way the layout is set up it seems that the auto-fill schedule feature should respond to the tune recommendations setting (which it doesn't, and that's fine), but it makes me think that this setting should be on the left side with the actual recommendations.
- ~Change "N cr" to "N units"~ - Danny

#### Progress:
- TBD

### TODO - tasks backlog
- ~Optimize frontend compilation performance, reduce dependencies~
- Optimize webpack CSS loading (right now CSS loads after JS, which loads after the body, resulting in no styling for 1/2 sec after page load)
- ~Brainstorm and implement intuitive user flow for L-R pane interaction~
- Log using local DB instead of StackDriver
- Reach out to CourseCrafter for API access (maybe)
- optimization to response time - reduce graph size
- ~automatic data extraction script instead of using notebooks~
