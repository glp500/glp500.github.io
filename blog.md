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

{% assign listening = site.data.listening %}
{% if listening.tracks and listening.tracks.size > 0 %}
  <section class="listening">
    <div class="shell">
      <div class="listening__panel">
        <p class="kicker">Lately</p>
        <ul class="listening__list">
          {% for track in listening.tracks %}
            <li>
              <span class="listening__title">
                {% if track.url and track.url != "" %}
                  <a href="{{ track.url }}" target="_blank" rel="noreferrer">{{ track.title }}</a>
                {% else %}{{ track.title }}{% endif %}
              </span>
              <span class="listening__artist">{{ track.artist }}</span>
            </li>
          {% endfor %}
        </ul>
        <p class="listening__note">
          Recently played, refreshed hourly from Spotify by a scheduled job.
          Nothing is requested from your browser.
        </p>
      </div>
    </div>
  </section>
{% endif %}
