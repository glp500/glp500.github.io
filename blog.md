---
title: Blog
layout: default
permalink: /blog/
nav_key: blog
description: Project updates, notes, and whatever else is worth writing down.
---
{% include page-hero.html intro=page.intro %}

{% assign items = site.posts | where_exp: "item", "item.published != false" %}
<section class="archive-section">
  <div class="shell">
    {% if items.size > 0 %}
      <div class="feed-list">
        {% for post in items %}
          {% include post-card.html post=post index=forloop.index %}
        {% endfor %}
      </div>
    {% else %}
      {% include empty-state.html title="Nothing posted yet." body="Updates on projects, reading, and work in progress will appear here." %}
    {% endif %}
  </div>
</section>
