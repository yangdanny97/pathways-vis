import extract
import graph
import time

MAJORS = ["Computer Science","Statistical Science","Information Science"]
CODES = ["cs","stsci","info"]
FILE_PATH = "./data/CIS_enrollment.csv"
OUTPUT_DIR = "./data/"
MIN_EDGE_WEIGHT = 1

for i in range(len(majors)):
    major, code = majors[i], codes[i]
    print("Processing: "+major)
    data = extract.Data(FILE_PATH, [major])
    print("extraction done!")
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
                g.addEdge(cname1, cname2, count)
        c += 1
    print("post-enrollment graph done!")
    fname = OUTPUT_DIR + code + "_post"
    g.export_json(fname, MIN_EDGE_WEIGHT)
    print("exported as " + fname + ".json")


