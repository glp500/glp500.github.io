---
title: Media & Literature
layout: default
nav_key: media
world_mode: media
description: Books, papers, videos, audio, and other influences worth returning to.
---
{% include page-hero.html mode="media" %}

{% assign items = site.media | where_exp: "item", "item.published != false" | sort: "date" | reverse %}
{% assign media_options = "Read|Watch|Listen|Use" | split: "|" %}
<section class="archive-section media-archive" data-filter-root data-world-mode="media">
  <div class="shell">
    {% include filter-controls.html label="Media filters" placeholder="Search creators, titles, and notes" options=media_options %}
    {% if items.size > 0 %}
      <div class="media-grid">
        {% for item in items %}
          <article class="media-card reveal" data-filter-item data-filter="{{ item.type | downcase | slugify }}" data-search="{{ item.title }} {{ item.creator }} {{ item.note }} {{ item.type }}">
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
      {% include empty-state.html title="The shelves are ready" body="Add Markdown entries to _media/ as books, papers, videos, talks, or tools become worth sharing." %}
    {% endif %}
    <div class="filter-empty" data-filter-empty hidden>No media entries match this combination.</div>
  </div>
</section>
