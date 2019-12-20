# Report:

### Overall Progress:
This semester we developed webapp for students to explore majors/courses at Cornell [LINK](pathway.cis.cornell.edu). The app is designed for the following 3 use cases:

1. Freshman who does not know what major to pick, want to see typical courses for each major
2. Upperclassman who wants to know what classes to take next semester
3. Upperclassman who wants suggestions for fun classes outside of major

We worked with Prof Rene Kizilcec and got constant feedback from his research group as well as the rest of CDS. We started essentially from scratch with the raw registrar data - the previous Pathways webapp was built on a different stack and we felt our idea was different enough that it didn't make sense to build off of their code.

Development was planned in 1 week sprints with weekly planning meetings, summaries of each sprint can be found in the journal (below).

#### Highlights:
1. **graph-based recommendation system** based on post-enrollment and co-enrollment graphs for each major (user can tune suggestion **diversity v.s. relevance**, use case #3)
2. server written in GoLang, a first for CDS
3. interactive/dynamic grid-based visualization allowing users to manipulate courses and focus on a specific semester (use case #2), **edge-overlap-reduction** heuristics
4. **hierarchical UI layout** based on feedback, robust search functionality which wraps the course roster API
5. **user interaction logging** (including hashed NetID for privacy)
6. QOL/ease-of-use features like **auto-fill example** schedule (use case #1), **bulk add** courses
7. **smart-add** - user specifies a course and we apply the recommendation system in reverse to make a guess for which semester it belongs in)

### Lessons:
1. **Good preprocessing -> easier to make good recommendations**: by preprocessing our data first into a bipartite students/courses graph and then further processing it into post-enrollment and co-enrollment graphs, it became much easier to understand our data and allowed us to make recommendations just by looking at a node's neighbors and their weights

2. **Don't discount heuristics**: our recommendation system is based on heuristics, and our edge-overlap-reducing layout is also a heuristic - both may not be objectively optimal, but they are "good enough" and more importantly very fast, which makes them more suitable for our task

3. **User Feedback is important**: as developers, we know how a system is supposed to work and when we click around it feels perfectly natural, but users who have never seen the system before might not agree. Getting feedback from users in the form of "I didn't expect this to happen" or "I didn't know how to do X" or "I don't know what Y does" is very valuable, because it exposes parts of the interface that are unintuitive to new users.

4. **Bridging the gap between "working" and "usable/useful" is hard**: it's one thing to have all the features in the backend and no bugs (which is what developers usually aim for), and another thing entirely to make an intuitive interface so that people will actually use them. This project made us appreciate how much thought goes into designing interfaces that are easy to understand for users.

### Future Work:
Features where the effort v.s. impact tradeoff didn't make sense in a 3 person team with time constraints.

1. building an **IR system** instead of relying on course roster API for course search (this would require scraping the course roster data every semester)
2. saving user data between sessions (probably as cookies)
3. more extensive user testing (requires larger user-base and A/B testing setup)
4. improvements to modeling. examples: prevent **crosslisted courses** from appearing in recommendations, **anti-corequisites** (courses which should be taken around a certain time but not simultaneously, like 3110/3410)

# Journal:

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
- began working on edge overlap resort - Eric

### Week ending 12/7

#### Goals:
- continue working on tasks backlog
- implement changes based on feedback
- prepare final presentation (slides, writeup, poster)

#### Feedback from Prof. Kizilcec
- Improve how the header bar looks: remove the red color, just show the Pathway logo top left
move the selected major down into the page body, add a label that says "XXX Major Pathway" and allow students to select a different one
- ~the search bar should be at the top of the list of courses I think~ - Danny
- ~rename "Auto-fill Schedule" with something that better describes what it does (Show an Example Pathway), same for "Add - Classes"~ - Danny (i wondered why it is only CS classes, also it is a very long list to navigate)
- ~Add a small (info) symbol next to the Course Recommendation type that has a hover-explanation of what it means to prioritize diversity and major-relevance~ - Danny
- ~Change Group to Semester and put the numbers 1 to 8 on the left hand side. I know it's not exact, but it is way more intuitive.~ - Danny
- ~Change the hover effect for courses (that shows course info) to a click-based effect. If you click a class circle, it will show the info on the left and let you remove it using the red button, be sure to highlight the selected class on the right hand side (maybe change the circle border color to blue. Can you also highlight the arrows that are connected to that node?~ - Danny
- ~The dashed circle text should say something more descriptive than "click to select", maybe "Add course" or "Course Recommendations"~ - Danny
- The way the layout is set up it seems that the auto-fill schedule feature should respond to the tune recommendations setting (which it doesn't, and that's fine), but it makes me think that this setting should be on the left side with the actual recommendations.
- ~Change "N cr" to "N units"~ - Danny

### Week ending 12/14 (Final sprint)

#### Goals:
- prepare CDS final presentation
- code cleanup, add documentation and README
- gather UI feedback and make improvements
- prepare Git repo for handoff

### Tasks backlog
- Get more info about Course Roster API search
- optimization to response time - reduce graph size
- Code cleanup
- Add move up/down functionality
- Make alerts nicer
- Hide "add" buttons for courses already in the graph
