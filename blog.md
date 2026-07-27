---
title: Field Notes
layout: default
nav_key: notes
world_mode: notes
description: Announcements, essays, project updates, and reading notes.
---
{% capture notes_intro %}A public notebook for announcements, essays, project updates, reading traces, and questions still taking shape.{% endcapture %}
{% include page-hero.html mode="notes" index="FIELD 07" label="Writing archive" kicker="Announcements · essays · updates" intro=notes_intro %}

{% assign items = site.posts | where_exp: "item", "item.published != false" %}
{% assign note_options = "Announcement|Essay|Project Update|Reading Note" | split: "|" %}
<section class="archive-section" data-filter-root data-world-mode="notes">
  <div class="shell">
    {% include filter-controls.html label="Writing filters" placeholder="Search titles, kinds, and topics" options=note_options %}
    {% if items.size > 0 %}
      <div class="notes-grid">
        {% for post in items %}
          <div data-filter-item data-filter="{{ post.kind | downcase | slugify }}" data-search="{{ post.title }} {{ post.excerpt }} {{ post.kind }} {{ post.tags | join: ' ' }}">
            {% include post-card.html post=post index=forloop.index %}
          </div>
        {% endfor %}
      </div>
    {% else %}
      {% include empty-state.html title="Notes coming soon" body="The archive is ready for announcements, essays, project updates, and reading notes." %}
    {% endif %}
    <div class="filter-empty" data-filter-empty hidden>No notes match this combination.</div>
  </div>
</section>
