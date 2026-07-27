---
title: My Work
layout: default
permalink: /my-work/
nav_key: my-work
world_mode: projects
description: Research studies, tools, ventures, and experiments, with the code behind them.
---
{% include page-hero.html mode="projects" index="FIELD 01" label="My work" %}

{% assign items = site.projects | where_exp: "item", "item.published != false" | sort: "date" | reverse %}
{% assign featured_items = items | where: "featured", true | sort: "featured_rank" %}

<section class="featured-projects" aria-labelledby="selected-work-title" data-world-mode="projects">
  <div class="shell">
    <div class="section-heading">
      <h2 id="selected-work-title">Selected work</h2>
    </div>
    <div class="project-grid project-grid--featured">
      {% for project in featured_items %}
        {% include project-card.html project=project index=forloop.index %}
      {% endfor %}
    </div>
  </div>
</section>

{% assign field_labels = site.data.fields | map: "label" %}
{% assign context_options = items | map: "context" | compact | uniq | sort %}
{% assign filter_options = field_labels | concat: context_options %}
<section class="archive-section" data-filter-root data-world-mode="research">
  <div class="shell">
    <div class="section-heading">
      <h2>All work</h2>
    </div>
    {% include filter-controls.html label="Filter by field or context" placeholder="Search titles, methods, and topics" options=filter_options %}
    <div class="project-ledger">
      {% for project in items %}
        {% include project-ledger-item.html project=project index=forloop.index %}
      {% endfor %}
    </div>
    <div class="filter-empty" data-filter-empty hidden>Nothing matches this combination.</div>
  </div>
</section>
