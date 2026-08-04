"""Draw a real subgraph from the extracted knowledge graph.

Everything is read out of final_ontology_extension.ttl, the file the pipeline
produced from the HHAI paper set. Nothing is invented for the picture.
"""
import sys, textwrap
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import networkx as nx
import rdflib

TTL = "/run/media/gavinl/T7/Python_Projects/Document-to-ConceptNet-main/final_ontology_extension.ttl"
GLASS, INK, MUTED, EDGE = "#1b2b36", "#eef2f4", "#8c9aa3", "#42586a"
PAPER, SCENARIO, CONCEPT, METRIC = "#e88950", "#3987e5", "#62c295", "#e5b863"

g = rdflib.Graph(); g.parse(TTL, format="turtle")
NS = "https://github.com/EliasLiinamaa/kgst_project_group_3/"
HI = "http://www.semanticweb.org/vbr240/ontologies/2022/4/untitled-ontology-51/"

def short(u):
    s = str(u)
    for p in (NS, HI, "https://api.conceptnet.io/c/en/", "http://dbpedia.org/resource/"):
        s = s.replace(p, "")
    return s.split("/")[-1].replace("_", " ").strip()

G, colors, labels = nx.DiGraph(), {}, {}
title_q = list(g.query(
    "SELECT ?p ?t WHERE { ?p <http://purl.org/dc/terms/title> ?t }"))
papers = [(p, str(t)) for p, t in title_q][:4]

for p, t in papers:
    pid = short(p)
    G.add_node(pid); colors[pid] = PAPER
    labels[pid] = "\n".join(textwrap.wrap(t, 26)[:3])
    for scen in g.objects(p, rdflib.URIRef(NS + "examinesScenario")):
        sid = short(scen)
        G.add_edge(pid, sid, label="examinesScenario")
        colors[sid] = SCENARIO
        labels[sid] = "\n".join(textwrap.wrap(sid, 18)[:2])
        # Entities point at the scenario, not the other way round.
        for ent in g.subjects(rdflib.URIRef(HI + "inScenario"), scen):
            eid = short(ent)
            G.add_edge(sid, eid, label="inScenario")
            colors.setdefault(eid, CONCEPT)
            labels[eid] = "\n".join(textwrap.wrap(eid, 16)[:2])
            for rel_name, col in (("metric", METRIC), ("informationMethod", CONCEPT),
                                  ("interactingAgent", CONCEPT)):
                base = NS if rel_name == "metric" else HI
                for o in g.objects(ent, rdflib.URIRef(base + rel_name)):
                    oid = short(o)
                    if not oid or oid.startswith("http"):
                        continue
                    G.add_edge(eid, oid, label=rel_name)
                    colors.setdefault(oid, col)
                    labels[oid] = "\n".join(textwrap.wrap(oid, 16)[:2])

fig, ax = plt.subplots(figsize=(12, 8.2), dpi=200)
fig.patch.set_facecolor(GLASS); ax.set_facecolor(GLASS); ax.axis("off")
# Layered rather than force-directed: the pipeline really is a chain,
# paper -> scenario -> what was extracted, and a spring layout hides that.
layer = {PAPER: 0, SCENARIO: 1}
for n in G:
    G.nodes[n]["layer"] = layer.get(colors[n], 2)
pos = nx.multipartite_layout(G, subset_key="layer", align="vertical", scale=2.4)
nx.draw_networkx_edges(G, pos, ax=ax, edge_color=EDGE, width=1.1,
                       arrows=True, arrowsize=9, node_size=1500)
nx.draw_networkx_nodes(G, pos, ax=ax, node_size=[1700 if colors[n] == PAPER else 900 for n in G],
                       node_color=[colors[n] for n in G], edgecolors=GLASS, linewidths=2)
for n, (x, y) in pos.items():
    right = G.nodes[n]["layer"] == 2
    ax.text(x + (0.09 if right else -0.09), y, labels.get(n, n),
            ha="left" if right else "right", va="center",
            fontsize=7.2, color=INK)
ax.margins(x=0.28)
ax.set_title("Four HHAI papers, and what the pipeline pulled out of them",
             color=INK, fontsize=13, loc="left", pad=16)
# Only label colours that actually appear, so the key never promises a
# category the picture does not contain.
present = set(colors[n] for n in G)
handles = [plt.Line2D([], [], marker="o", ls="", markersize=8, color=c, label=l)
           for c, l in [(PAPER, "paper"), (SCENARIO, "scenario"),
                        (CONCEPT, "concept / actor"), (METRIC, "metric")]
           if c in present]
leg = ax.legend(handles=handles, loc="upper right", frameon=False, fontsize=9,
                bbox_to_anchor=(1.0, 1.02))
for t in leg.get_texts(): t.set_color(INK)
fig.tight_layout()
fig.savefig(sys.argv[1], facecolor=GLASS)
print("nodes", G.number_of_nodes(), "edges", G.number_of_edges())
