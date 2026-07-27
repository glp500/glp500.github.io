---
title: Research
layout: default
nav_key: research
world_mode: research
description: Enduring research programs spanning collective intelligence, cybernetics, computational history, and machine learning.
---
{% capture research_intro %}Enduring questions about intelligence, history, feedback, and the systems through which they take form.{% endcapture %}
{% include page-hero.html mode="research" index="FIELD 01" label="Research programs" kicker="Questions · methods · connections" intro=research_intro %}

{% assign items = site.research | where_exp: "item", "item.published != false" %}
<section class="archive-section" data-world-mode="research">
  <div class="shell">
    <div class="research-ledger">
      {% for item in items %}
        <article class="research-ledger__item reveal">
          <div class="research-ledger__index">0{{ forloop.index }}</div>
          <div class="research-ledger__main">
            <p class="card-meta"><span>{{ item.status }}</span><span>{{ item.dates }}</span></p>
            <h2><a href="{{ item.url | relative_url }}">{{ item.title }}</a></h2>
            <p class="research-ledger__question">{{ item.question }}</p>
            <p>{{ item.summary }}</p>
          </div>
          <div class="research-ledger__aside">
            <ul class="tag-list">
              {% for method in item.methods %}<li>{{ method }}</li>{% endfor %}
            </ul>
            <a class="arrow-link" href="{{ item.url | relative_url }}">Explore →</a>
          </div>
        </article>
      {% endfor %}
    </div>
  </div>
</section>
