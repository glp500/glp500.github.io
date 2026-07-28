---
title: Publications
layout: default
nav_key: publications
world_mode: publications
description: Papers and formal research outputs, with the working material behind them.
---
{% include page-hero.html mode="publications" %}

{% assign items = site.publications | where_exp: "item", "item.published != false" | sort: "year" | reverse %}
<section class="archive-section" data-world-mode="publications">
  <div class="shell">
    <div class="publication-ledger">
      {% for publication in items %}
        {% include publication-card.html publication=publication %}
      {% endfor %}
    </div>
  </div>
</section>
