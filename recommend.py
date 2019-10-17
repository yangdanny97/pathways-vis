#%% [markdown]
# # Recommending classes
# In this notebook, I'll be working toward a recommendation algorithm which can
# make useful class recommendations to students. This may take any of several
# different forms, described below:
# 
# ## General Recommendations
# A good starting point, we may want to just accept one set of classes and find
# a set of classes which are also closely related or interesting.
#
# ## Point-to-Point
# We may see students define a set of classes they have taken, and a set of
# classes they would like to take. In this case, the algorithm would ideally
# provide a set of classes which either lie between those classes or would just
# also be generally interesting to that student.
#
# ## Exploratory
# This is much more challenging - we may want to recommend classes that the
# student has not yet demonstrated an interest in, but could potentially find
# intriguing. I don't know if we have the data to do this, but it would align
# closely with Pf. Kilczec's ideas.

#%% Imports
import pandas as pd
import numpy as np
import test_extract
from test_extract import Data
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List

FILENAME = "data/CIS_enrollment.csv"
ENCODING = "iso-8859-1"

data = Data(FILENAME)
raw  = pd.read_csv(FILENAME, encoding=ENCODING)

#%% [markdown]
# ## Student-wise
# One easy way to make recommendations is to identify students who have taken
# the same or a similar set of courses and see what else they tend to take.

#%% [markdown]
# ## Crosslisting
# We actually run into a fairly important problem here - crosslisting.
# Crosslisted courses, which are for our purposes the same, are distinct in the
# data model which greatly limits the accuracy of any model we build.

#%% Helper function
def translate(codes: List[str]) -> List[test_extract.Course]:
    """ Convert course codes into Course objects """
    courses = []
    for code in codes:
        courses.append(data.filterCourses(lambda c: c.id==code)[0])
    return courses

def show_results(df: pd.DataFrame):
    df['c'] = df.course.map(lambda code: 'C1' if code in beta else 'C0')
    df['size'] = df.course.map(lambda c: len(c.students))
    top = df.head(20)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10,5))
    plt.subplots_adjust(wspace=0.4)

    ax1.scatter(df['size'], df.score, color=df.c)
    ax1.set_title("Overall Score Distribution")
    ax1.set_xlabel("Number of Students")
    ax1.set_ylabel("Score")


    ax2.barh(top.code, top.score, color=top.c)
    ax2.set_title("Class Recommendations")
    ax2.set_xlabel("Score")
    ax2.invert_yaxis()

    fig.show()
    return df.head(10)


#%% Recommend by student
def recommend_bystudent(courses: List[test_extract.Course]) -> pd.DataFrame:
    students = [course.students for course in courses]

    targets = set.intersection(*students)

    courses = data.getCourses()
    scores = map(lambda c: len(set.intersection(targets, c.students)), courses)

    recommendations = {
        'code': [course.id for course in courses],
        'course': courses,
        'score' : scores
    }

    return pd.DataFrame(recommendations).sort_values('score', ascending=False)

#%% Make a recommendation
beta = translate(["CS2110", "CS2800", "CS2850", "CS1110"])

df = recommend_bystudent(beta)
show_results(df)

#%% [markdown]
# Neat! This is actually pretty bad though. For one thing, we aren't
# accommodating for class sizes *at all*, so it's very heavily biased toward
# large classes. Note that it ranks ECON 1110, an almost completely unrelated
# course, above most relevant computer science electives. This is because Intro
# Microecon is just a massive class, so it's bound to have more of our target
# students in it than any smaller elective class. We can solve this. Instead of
# counting how many target students are in each class, let's count what
# proportion of the students who take each class are in our target population.

#%%
def recommend_bystudent_prop(courses: List[test_extract.Course], threshold=20) -> pd.DataFrame:
    students = [course.students for course in courses]

    targets = set.intersection(*students)

    def score(c: test_extract.Course) -> float:
        class_size = len(c.students)
        target_pop = len(set.intersection(targets, c.students))
        if class_size < threshold:
            return 0
        return target_pop / class_size

    courses = data.getCourses()
    scores = map(score, courses)

    recommendations = {
        'code': [course.id for course in courses],
        'course': courses,
        'score' : list(scores),
        'size': [len(course.students) for course in courses]
    }

    return pd.DataFrame(recommendations).sort_values('score', ascending=False)

#%% [markdown]
# As usual, when using a ratio-based scoring method, we run into problems at the
# extreme low ends of the denominator (in this case, class size). We can see why
# in this chart.

#%%
beta = translate(["CS2110", "CS2800", "CS2850", "CS1110"])

df = recommend_bystudent_prop(beta)
show_results(df)

#%% [markdown]
# It should be pretty clear from the scatterplot above that we're skirting a
# critical problem. Let's demonstrate:

#%%
beta = translate(["CS2110", "CS2800", "CS2850", "CS1110", "CS4740"])

df = recommend_bystudent_prop(beta)
show_results(df)

#%% [markdown]
# Obviously the model isn't actually very robust against adding classes. When we
# add a small class, the target population becomes so small that we tend to get
# scattered and random results. There's an argument to be made here that this
# could actually provide the kind of diversity of recommendation that Kilczec is
# looking for, but it doesn't seem to me that these recommendations are really
# that helpful for a given student. One way to improve might be to "soften" our
# target student pool - to include results from more students, but simply
# prioritize students who have taken classes in the input set.

#%%
beta = translate(["CS4780", "INFO3300", "CS4740"])

df = recommend_bystudent(beta)
show_results(df)
