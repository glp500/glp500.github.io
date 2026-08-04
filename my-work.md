---
title: My Work
layout: default
permalink: /my-work/
nav_key: my-work
description: Studies, tools and experiments, with the code behind them.
---
{% include page-hero.html %}

{% assign items = site.projects | where_exp: "item", "item.published != false" | sort: "date" | reverse %}
{% assign featured_items = items | where: "featured", true | sort: "featured_rank" %}
{% assign rest = items | where_exp: "item", "item.featured != true" %}
{% assign ordered = featured_items | concat: rest %}

{% assign field_labels = site.data.fields | map: "label" %}
{% assign context_options = items | map: "context" | compact | uniq | sort %}
{% assign filter_options = field_labels | concat: context_options %}
<section class="archive-section" data-filter-root>
  <div class="shell">
    {% include filter-controls.html label="Filter by field or context" placeholder="Search titles, methods, and topics" options=filter_options %}
    <div class="project-ledger">
      {% for project in ordered %}
        {% include project-ledger-item.html project=project index=forloop.index %}
      {% endfor %}
    </div>
    <div class="filter-empty" data-filter-empty hidden>Nothing matches this combination.</div>
  </div>
</section>
