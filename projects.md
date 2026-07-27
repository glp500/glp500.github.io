---
title: Projects
layout: default
nav_key: projects
world_mode: projects
description: Concrete studies, tools, ventures, experiments, and research outputs.
---
{% capture projects_intro %}Concrete studies, tools, ventures, and experiments emerging from the wider research fields.{% endcapture %}
{% include page-hero.html mode="projects" index="FIELD 02" label="Projects" kicker="Building as a way of thinking" intro=projects_intro %}

{% assign items = site.projects | where_exp: "item", "item.published != false" | sort: "date" | reverse %}
{% assign status_options = items | map: "status" | uniq %}
<section class="archive-section" data-filter-root data-world-mode="projects">
  <div class="shell">
    {% include filter-controls.html label="Project filters" placeholder="Search projects, methods, and topics" options=status_options %}
    <div class="project-grid project-grid--archive">
      {% for project in items %}
        {% include project-card.html project=project index=forloop.index %}
      {% endfor %}
    </div>
    <div class="filter-empty" data-filter-empty hidden>No projects match this combination. Reset the archive to see everything.</div>
  </div>
</section>
