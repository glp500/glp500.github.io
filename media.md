---
title: Media & Literature
layout: default
nav_key: media
world_mode: media
description: Books, papers, videos, audio, and other influences worth returning to.
---
{% capture media_intro %}A working shelf for material I am reading, watching, and listening to—kept with brief notes rather than scores.{% endcapture %}
{% include page-hero.html mode="media" index="FIELD 04" label="Media & literature" kicker="Read · watch · listen" intro=media_intro %}

{% assign items = site.media | where_exp: "item", "item.published != false" | sort: "date" | reverse %}
{% assign media_options = "Read|Watch|Listen" | split: "|" %}
<section class="archive-section media-archive" data-filter-root data-world-mode="media">
  <div class="shell">
    {% include filter-controls.html label="Media filters" placeholder="Search creators, titles, and notes" options=media_options %}
    {% if items.size > 0 %}
      <div class="media-grid">
        {% for item in items %}
          <article class="media-card reveal" data-filter-item data-filter="{{ item.type | downcase | slugify }}" data-search="{{ item.title }} {{ item.creator }} {{ item.note }} {{ item.type }}">
            <div class="media-card__visual">
              {% if item.image and item.image != "" %}
                <img src="{{ item.image | relative_url }}" alt="{{ item.image_alt | default: '' }}">
              {% else %}
                {% include specimen.html kind="media" %}
              {% endif %}
            </div>
            <p class="card-meta"><span>{{ item.type }}</span><span>{{ item.status }}</span></p>
            <h2><a href="{{ item.external_url }}" target="_blank" rel="noreferrer">{{ item.title }}</a></h2>
            <p>{{ item.creator }}</p>
            <p>{{ item.note }}</p>
          </article>
        {% endfor %}
      </div>
    {% else %}
      {% include empty-state.html title="The shelves are ready" body="Add Markdown entries to _media/ as books, papers, videos, talks, albums, or field recordings become worth sharing. The Read, Watch, and Listen filters are already wired for them." %}
    {% endif %}
    <div class="filter-empty" data-filter-empty hidden>No media entries match this combination.</div>
  </div>
</section>
