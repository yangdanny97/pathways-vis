# Pathways: a Data Driven Course Recommender

#### Danny Yang, Eric Sun, Sam Fuchs - CDS Insights

Interactive visualization of course progressions through cornell CIS, based on anonymized registrar data. Recommendation system for what courses to take + when to take them.

Update: The website is no longer online or up-to-date, as it was intended as a short-term research project. See [this blog post](https://yangdanny97.github.io/blog/2020/05/02/course-recommender-system) for a writeup about the design and learnings.

# Repo Description

## Directory:
- `unused_vis` - unused visualization code for alternative ideas that we explored, retained for reference
- `exploratory` - files for exploratory data analysis (python notebooks, data extraction script). of these, `extract_script.py` pre-processses the data, using `extract.py` to load the original CSV and `graph.py` to model the graph
- `www` - source code for pathways webapp (see README in that directory for more info)

## Data Preprocessing
- make sure you have python3 and the various packages that our preprocessing uses (nothing fancy)
- cd into `exploratory` and run `python extract_script.py` (you can edit the constants at the top of the file to change how the script runs)
- output JSON files will be in `exploratory/data`, to use them in the production app copy it to `www/data`

# Final Report/Journal

see report.md
