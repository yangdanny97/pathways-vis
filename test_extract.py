import os
import json
from typing import Dict, List, Tuple, Any, Callable, Set
rootdir = './data'
schema_desc = """
term: (2018, 0) second item is 0 for SP, 2 for FA
term number: 2
course number: CS 3110
"""
Term = Tuple[int, int]


class Semester:
    SP = 0
    SU = 1
    FA = 2
    WI = 3


def maketerm(term: str):
    sem_ids = ["SP", "SU", "FA", "WI"]
    yr, sem = term[:4], term[4:]
    return int(yr), sem_ids.index(sem)


class Student:
    def __init__(self, id_: str, major: str):
        self.id = id_
        self.major = major
        # set of courses this student has taken
        self.courses: Set[Course] = set()
        # (course number, term)
        self.terms: List[Tuple[str, Term]] = []
        # (course number, term number)
        self.term_numbers: Dict[str, int] = {}

    def hasTaken(course: str) -> bool:
        return course in self.courses

    def __str__(self):
        return str({"id": self.id, "major": self.major, "courses": [c.name for c in self.courses], "terms": self.terms, "term_numbers": self.term_numbers})

    def getCourseSemester(course: str) -> int:
        return self.term_numbers[course]

    # return difference between semesters for course 1 and course 2
    # throws exception if student didn't take the courses
    # ex: if student took course1 in FA18 and student took course 2 in FA19
    # it would output 2
    # if student took courses at the same time, output 0
    # if student took second course before first course then outputs negative
    def compareCourses(course1: str, course2: str) -> int:
        s1 = self.getCourseSemester(course1)
        s2 = self.getCourseSemester(course2)
        return s2 - s1

    def getCoursesForSemester(semester: int) -> Set[str]:
        return set([self.term_numbers[k] for k in self.term_numbers if self.term_numbers[k] == semester])

    def getCoursesBeforeSemester(semester: int) -> Set[str]:
        return set([k for k in self.term_numbers if self.term_numbers[k] < semester])


class Course:
    def __init__(self, num: str, name: str):
        self.id = num
        self.name = name
        # students that have taken the course
        self.students: Set[Student] = set()
        # set of terms that this course was taken in
        self.terms: Set[Term] = set()
        # list of term NUMBERS that this class was taken in
        self.term_numbers: List[int] = []

    def __str__(self):
        return str({"id": self.id, "name": self.name, "students": [s.id for s in self.students], "terms": self.terms, "term_numbers": self.term_numbers})


class Data:
    def __init__(self, path: str):
        self.courses: Dict[str, Course] = {}  # course number lookup
        self.students: Dict[str, Student] = {}  # student id lookup
        self.rows = []
        x = 0
        with open(path, "r", encoding="ISO-8859-1") as f:
            rows = []
            try:
                for l in f:
                    if x > 0:
                        rows.append(l)
                    x += 1
            except:
                print(x)
            lecs = self._getLecs(rows)
            for r in rows:
                self._processRow(r, lecs)
        self._processTerms()

    def getStudents(self) -> List[Student]:
        return [self.students[s] for s in self.students]

    def getCourses(self) -> List[Course]:
        return [self.courses[s] for s in self.courses]

    def filterStudents(self, f: Callable[[Student], bool]) -> List[Student]:
        return [self.students[s] for s in self.students if f(self.students[s])]

    def filterCourses(self, f: Callable[[Course], bool]) -> List[Course]:
        return [self.courses[s] for s in self.courses if f(self.courses[s])]

    def _getLecs(self, rows: List[str]):
        lecs = set()
        for row in rows:
            row = row[:-1].split(",")
            course_num = row[3]
            course_type = row[7]
            if course_type == "LEC":
                lecs.add(course_num)
        return lecs

    def _processRow(self, row: str, lecs: List[str]):
        row = row[:-1].split(",")
        stu_id = row[0]
        major = row[1][1:-1]
        term: Term = maketerm(row[2][1:-1])
        course_num = row[3][1:-1]
        course_name = row[4][1:-1]
        course_type = row[7][1:-1]
        '''
        filtered out:
        1. summer
        2. anything not LEC/DIS
        3. DIS that has a LEC
        '''

        # only spring and fall
        if term[1] not in [Semester.SP, Semester.FA]:
            return
        # lecture/discussion only
        if course_type not in ["LEC", "DIS"]:
            return
        # discussion that has a lecture
        if course_type == "DIS" and course_num in lecs:
            return

        student = None
        if stu_id not in self.students:
            student = Student(stu_id, major)
            self.students[stu_id] = student
        else:
            student = self.students[stu_id]

        course = None
        if course_num not in self.courses:
            course = Course(course_num, course_name)
            self.courses[course_num] = course
        else:
            course = self.courses[course_num]

        course.students.add(student)
        course.terms.add(term)
        student.courses.add(course)
        student.terms.append((course_num, term))

    def _processTerms(self):
        # process term numbers
        for s in self.students:
            student = self.students[s]
            sorted_terms = student.terms[:]
            sorted_terms.sort(key=lambda x: x[1])
            c = 1
            current_term = sorted_terms[0][1]
            for t in sorted_terms:
                t_course, t_term = t
                if t_term == current_term:
                    student.term_numbers[t_course] = c
                    self.courses[t_course].term_numbers.append(c)
                else:
                    c += 1
                    current_term = t_term
                    student.term_numbers[t_course] = c
                    self.courses[t_course].term_numbers.append(c)


'''
to initialize:
data = Data("./CIS_enrollment.csv")

get all students for course X:
data.courses[X].students

get all students for major X:
[s for s in data.getStudents() if s.major == X]

get courses that were offered fall 2018 or later:
[c for c in data.getCourses() if max(c.terms) >= (2018,1)]

we can filter students and courses with a lambda
we can also dump the Student/Course objects as a JSON string
'''
