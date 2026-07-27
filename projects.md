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
{% assign featured_items = items | where: "featured", true | sort: "featured_rank" %}
<section class="featured-projects" aria-labelledby="featured-projects-title" data-world-mode="projects">
  <div class="shell">
    <div class="section-heading">
      <div>
        <p class="kicker">Selected case studies</p>
        <h2 id="featured-projects-title">Featured work</h2>
      </div>
      <p>Eight projects presented through their questions, systems, evidence, and wider research context.</p>
    </div>
    <div class="project-grid project-grid--featured">
      {% for project in featured_items %}
        {% include project-card.html project=project index=forloop.index %}
      {% endfor %}
    </div>
  </div>
</section>

{% assign context_options = items | map: "context" | compact | uniq | sort %}
<section class="archive-section" data-filter-root data-world-mode="projects">
  <div class="shell">
    <div class="section-heading">
      <div>
        <p class="kicker">Complete record</p>
        <h2>All projects</h2>
      </div>
      <p>Research studies, startup prototypes, graduate collaborations, and independent experiments.</p>
    </div>
    {% include filter-controls.html label="Project filters" placeholder="Search projects, methods, programs, and topics" options=context_options %}
    <div class="project-ledger">
      {% for project in items %}
        {% include project-ledger-item.html project=project index=forloop.index %}
      {% endfor %}
    </div>
    <div class="filter-empty" data-filter-empty hidden>No projects match this combination. Reset the archive to see everything.</div>
  </div>
</section>
