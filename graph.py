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
        self.edges: List[Edge] = []

    def addEdge(self, src: str, dest: str, weight: int, check=False):
        self.nodes.add(src)
        self.nodes.add(dest)
        if check:
            if not getEdge(src, dest):
                self.edges.append(Edge(src, dest, weight))
        else:
            self.edges.append(Edge(src, dest, weight))

    def getPreds(self, node: str) -> Set[str]:
        return [e.src for e in self.edges if e.dest == node]

    def getSucc(self, node: str) -> Set[str]:
        return [e.dest for e in self.edges if e.src == node]

    def filterEdges(self, fn: Callable[[Edge], bool]) -> List[Edge]:
        return [e for e in self.edges if fn(e)]

    def getInEdges(self, node: str) -> Set[str]:
        return self.filterEdges(lambda e: e.dest == node)

    def getOutEdges(self, node: str) -> Set[str]:
        return self.filterEdges(lambda e: e.src == node)

    def getEdge(self, src: str, dest: str):
        filtered = self.filterEdges(lambda e: e.src == src and e.dest == dest)
        if len(filtered) > 0:
            return filtered[0]
        return None

    def __str__(self):
        return [str(e) for e in self.edges if e.weight >= threshold]

    def print(self, threshold=0):
        edges = [str(e) for e in self.edges if e.weight >= threshold]
        for e in edges:
            print(e)
