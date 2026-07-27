---
title: Publications
layout: default
nav_key: publications
world_mode: publications
description: Papers, formal research outputs, and working materials.
---
{% include page-hero.html mode="publications" %}

{% assign items = site.publications | where_exp: "item", "item.published != false" | sort: "year" | reverse %}
{% assign status_options = items | map: "status" | uniq %}
<section class="archive-section" data-filter-root data-world-mode="publications">
  <div class="shell">
    {% include filter-controls.html label="Publication filters" placeholder="Search titles, authors, venues, and topics" options=status_options %}
    <div class="publication-ledger">
      {% for publication in items %}
        {% include publication-card.html publication=publication %}
      {% endfor %}
    </div>
    <div class="filter-empty" data-filter-empty hidden>No publications match this search. Reset the ledger to see the complete record.</div>
  </div>
</section>
