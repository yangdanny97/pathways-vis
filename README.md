# Pathways: Data Driven Course Recommender

visualization project of pathways through cornell CIS

# Repo Description

## Directory:
- `unused_vis` - unused visualization code for alternative ideas that we explored, retained for reference
- `exploratory` - files for exploratory data analysis (python notebooks, data extraction script). of these, `extract_script.py` pre-processses the data, using `extract.py` to load the original CSV and `graph.py` to model the graph
- `www` - source code for pathways webapp (see README in that directory for more info)

## Data Preprocessing
- make sure you have python3 and the various packages that our preprocessing uses (nothing fancy)
- cd into `exploratory` and run `python extract_script.py` (you can edit the constants at the top of the file to change how the script runs)
- output JSON files will be in `exploratory/data`, to use them in the production app copy it to `www/data`

# Report/Journal

see report.md
