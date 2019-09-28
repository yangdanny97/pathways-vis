from typing import Dict, List, Tuple, Any, Callable, Set


class Edge:
    def __init__(self, src, dest, weight=0, kind=None):
        self.src = src
        self.dest = dest
        self.kind = kind
        self.weight = weight

    def incr(self, n=1):
        self.weight += n

    def __str__(self):
        return "({},{},{})".format(self.src, self.dest, self.weight)


class Graph:
    def __init__(self):
        self.nodes: Set[str] = set()
        self.edges: Dict[Tuple[str,str], Edge] = {}

    def addEdge(self, src: str, dest: str, weight: int, check=False):
        self.nodes.add(src)
        self.nodes.add(dest)
        if check:
            if not getEdge(src, dest):
                self.edges[(src, dest)] = Edge(src, dest, weight)
        else:
            self.edges[(src, dest)] = Edge(src, dest, weight)

    def getPreds(self, node: str) -> Set[str]:
        return [e.src for e in self.edges.values() if e.dest == node]

    def getSucc(self, node: str) -> Set[str]:
        return [e.dest for e in self.edges.values() if e.src == node]

    def filterEdges(self, fn: Callable[[Edge], bool]) -> List[Edge]:
        return [e for e in self.edges.values() if fn(e)]

    def getInEdges(self, node: str) -> Set[str]:
        return self.filterEdges(lambda e: e.dest == node)

    def getOutEdges(self, node: str) -> Set[str]:
        return self.filterEdges(lambda e: e.src == node)

    def getEdge(self, src: str, dest: str):
        if (src,dest) in self.edges:
            return self.edges[(src,dest)]
        else:
            return None

    def __str__(self):
        return [str(e) for e in self.edges.values() if e.weight >= threshold]

    def print(self, threshold=0):
        edges = [str(e) for e in self.edges.values() if e.weight >= threshold]
        for e in edges:
            print(e)

    def export_graph(self, name:str, threshold=0):
        edges = [e for e in self.edges.values() if e.weight >= threshold]
        nodes = set([e.src for e in edges]).intersection(set([e.dest for e in edges]))
        fname = name+".dot"
        with open(fname, "w") as f:
            f.write("digraph course_graph {\n")
            for e in edges:
                f.write('{} -> {} [ label = "{}" ];\n'.format(e.src, e.dest, e.weight))
            for n in nodes:
                f.write('{} [ label = "{}" ];\n'.format(n,n))
            f.write("}\n")
        print("done! exported as {}.dot".format(name))