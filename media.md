---
title: Media & Literature
layout: default
nav_key: media
world_mode: media
description: Books, papers, talks and tools worth returning to.
---
{% include page-hero.html mode="media" %}

{% assign items = site.media | where_exp: "item", "item.published != false" | sort: "date" | reverse %}
<section class="archive-section media-archive" data-world-mode="media">
  <div class="shell">
    {% if items.size > 0 %}
      <div class="media-grid">
        {% for item in items %}
          <article class="media-card reveal">
            {% if item.image and item.image != "" %}
              <div class="media-card__visual">
                <img src="{{ item.image | relative_url }}" alt="{{ item.image_alt | default: '' }}">
              </div>
            {% endif %}
            <p class="card-meta"><span>{{ item.type }}</span><span>{{ item.status }}</span></p>
            <h2><a href="{{ item.external_url }}" target="_blank" rel="noreferrer">{{ item.title }}</a></h2>
            <p>{{ item.creator }}</p>
            <p>{{ item.note }}</p>
          </article>
        {% endfor %}
      </div>
    {% else %}
      {% include empty-state.html title="The shelves are ready" body="Nothing on them yet." %}
    {% endif %}
  </div>
</section>
