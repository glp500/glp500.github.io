---
title: Publications
layout: default
nav_key: publications
description: Papers and formal research outputs, with the working material behind them.
---
{% include page-hero.html %}

{% assign items = site.publications | where_exp: "item", "item.published != false" | sort: "year" | reverse %}
<section class="archive-section">
  <div class="shell">
    <div class="publication-ledger">
      {% for publication in items %}
        {% include publication-card.html publication=publication %}
      {% endfor %}
    </div>
  </div>
</section>
