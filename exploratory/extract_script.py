import extract
import graph
import time

MAJORS = ["Computer Science","Statistical Science","Information Science"] # majors to process (individually)
CODES = ["cs","stsci","info"] # codes for the above majors, for naming graphs - must be lowercased department name
FILE_PATH = "./data/CIS_enrollment.csv"
OUTPUT_DIR = "./data/"
MIN_EDGE_WEIGHT = 0

for i in range(len(MAJORS)):
    major, code = MAJORS[i], CODES[i]
    print("Processing: "+major)
    data = extract.Data(FILE_PATH, [major])
    print("extraction done!")
    # Pre-process to remove courses not offered after 2017FA
    for cname in list(data.courses):
        if max(data.courses[cname].terms) < (2017,1):
            del data.courses[cname]
    # CO-ENROLLMENT
    g = graph.Graph()
    c = 1
    for cname1 in data.courses:
        if c % 250 == 0:
            print(c)
        for cname2 in data.courses:
            if cname2 == cname1:
                continue
            course = data.courses[cname1]
            count = 0
            for s in course.students:
                if cname2 in s.term_numbers and s.term_numbers[cname2] == s.term_numbers[cname1]:
                    count += 1
            if count > 0:
                g.addEdge(cname1, cname2, count)
        c += 1
    print("co-enrollment graph done!")
    fname = OUTPUT_DIR + code + "_co"
    g.export_json(fname, MIN_EDGE_WEIGHT)
    print("exported as " + fname + ".json")
    # POST-ENROLLMENT
    g = graph.Graph()
    c = 1
    for cname1 in data.courses:
        if c % 250 == 0:
            print(c)
        for cname2 in data.courses:
            if cname2 == cname1:
                continue
            course = data.courses[cname1]
            count = 0
            for s in course.students:
                if cname2 in s.term_numbers and s.term_numbers[cname2] == s.term_numbers[cname1] + 1:
                    count += 1
            if count > 0:
                # if the weight of A -> B and B -> A differ by a factor of 2 or more then we only keep 
                # the one with larger weight
                if (cname2, cname1) not in g.edges:
                    g.addEdge(cname1, cname2, count)
                elif g.edges[(cname2, cname1)].weight  > count * 2:
                    pass
                elif g.edges[(cname2, cname1)].weight  < count / 2:
                    g.addEdge(cname1, cname2, count)
                    del g.edges[(cname2, cname1)]
                else:
                    g.addEdge(cname1, cname2, count)
        c += 1
    print("post-enrollment graph done!")
    fname = OUTPUT_DIR + code + "_post"
    g.export_json(fname, MIN_EDGE_WEIGHT)
    print("exported as " + fname + ".json")


