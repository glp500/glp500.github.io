---
title: Open Source
layout: default
nav_key: resources
world_mode: resources
description: Original and curated code, data, methods, templates, and references.
---
{% capture resources_intro %}Code, data, methods, and references organized by provenance so useful things remain inspectable.{% endcapture %}
{% include page-hero.html mode="resources" index="FIELD 05" label="Open resources" kicker="Build · inspect · reuse" intro=resources_intro %}

{% assign items = site.resources | where_exp: "item", "item.published != false" | sort: "date" | reverse %}
{% assign resource_options = "Code|Dataset|Template|Tool|Reference" | split: "|" %}
<section class="archive-section resource-archive" data-filter-root data-world-mode="resources">
  <div class="shell">
    {% include filter-controls.html label="Resource filters" placeholder="Search resources, languages, and topics" options=resource_options %}
    {% if items.size > 0 %}
      {% assign own_items = items | where: "ownership", "own" %}
      {% assign curated_items = items | where: "ownership", "curated" %}
      {% if own_items.size > 0 %}
        <div class="resource-group">
          <div class="resource-group__heading"><span>01</span><h2>My work</h2></div>
          <div class="resource-list">
            {% for item in own_items %}
              <article class="resource-card reveal" data-filter-item data-filter="{{ item.type | downcase | slugify }}" data-search="{{ item.title }} {{ item.summary }} {{ item.language }} {{ item.license }} {{ item.topics | join: ' ' }}">
                <p class="card-meta">
                  <span>{{ item.type }}</span>
                  {% if item.language and item.language != "" %}<span>{{ item.language }}</span>{% endif %}
                  {% if item.license and item.license != "" %}<span>{{ item.license }}</span>{% endif %}
                </p>
                <h3><a href="{{ item.repo_url | default: item.external_url }}" target="_blank" rel="noreferrer">{{ item.title }} ↗</a></h3>
                <p>{{ item.summary }}</p>
              </article>
            {% endfor %}
          </div>
        </div>
      {% endif %}
      {% if curated_items.size > 0 %}
        <div class="resource-group">
          <div class="resource-group__heading"><span>02</span><h2>Curated resources</h2></div>
          <div class="resource-list">
            {% for item in curated_items %}
              <article class="resource-card reveal" data-filter-item data-filter="{{ item.type | downcase | slugify }}" data-search="{{ item.title }} {{ item.summary }} {{ item.language }} {{ item.license }} {{ item.topics | join: ' ' }}">
                <p class="card-meta">
                  <span>{{ item.type }}</span>
                  {% if item.language and item.language != "" %}<span>{{ item.language }}</span>{% endif %}
                  {% if item.license and item.license != "" %}<span>{{ item.license }}</span>{% endif %}
                </p>
                <h3><a href="{{ item.external_url }}" target="_blank" rel="noreferrer">{{ item.title }} ↗</a></h3>
                <p>{{ item.summary }}</p>
              </article>
            {% endfor %}
          </div>
        </div>
      {% endif %}
    {% else %}
      {% include empty-state.html title="A public toolkit is taking shape" body="Original repositories, datasets, templates, and carefully annotated external references will live here. The page is ready to distinguish my work from curated material." %}
    {% endif %}
    <div class="filter-empty" data-filter-empty hidden>No resources match this combination.</div>
  </div>
</section>
